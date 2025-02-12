<script lang="ts" generics="T extends TimelineItemSource">
	import { type TimelineNavigation } from "./controls/TimelineNavigation";
	import { writable as makeWritable, writable } from "svelte/store";
	import { timelineNavigation } from "./controls/TimelineNavigation";
	import TimelineRuler from "./layout/ruler/TimelineRuler.svelte";
	import type { NamespacedWritableFactory } from "./Persistence";
	import CanvasStage from "./layout/stage/CanvasStage.svelte";
	import type { TimelineViewModel } from "./viewModel";
	import { ValuePerPixelScale, type Scale } from "./scale";
	import TimelineNavigationControls from "./controls/TimelineNavigationControls.svelte";
	import TimelineSettings from "./controls/settings/TimelineSettings.svelte";
	import type { RulerValueDisplay } from "src/timeline/Timeline";
	import { type Groups as TimelineGroups } from "src/timeline/group/TimelineGroupsList.svelte";
	import { mount, type Snippet, unmount, untrack } from "svelte";
	import TimelineGroupsSettingsSection from "src/timeline/group/TimelineGroupsSettingsSection.svelte";
	import { ObservableCollapsable } from "src/view/collapsable";
	import LucideIcon from "src/obsidian/view/LucideIcon.svelte";
	import ActionButton from "src/view/inputs/ActionButton.svelte";
	import TimelineInteractionsHelp from "./TimelineInteractionsHelp.svelte";
	import {
		timelineItem,
		type TimelineItem,
		type TimelineItemSource,
	} from "src/timeline/item/TimelineItem.svelte";

	type Item = T;

	interface Props {
		namespacedWritable: NamespacedWritableFactory<TimelineViewModel>;
		groups: TimelineGroups;
		display: RulerValueDisplay;
		controlBindings: {};

		items: ReadonlyArray<Item>;
		selectValue(item: Item): number;
		selectLength(item: Item): number;

		summarizeItem: (item: Item) => string;
		previewItem: (
			name: string,
			value: number,
			length: number,
			endValue: number,
		) => string;
		pendingGroupUpdates: number;
		openDialog(
			callback: (modal: {
				containerEl: HTMLElement;
				modalEl: HTMLElement;
				titleEl: HTMLElement;
				contentEl: HTMLElement;
			}) => () => void,
		): void;

		onPreviewNewItemValue(item: Item, value: number): number;
		itemsResizable: boolean;
		onItemsResized(
			resized: {
				item: Item;
				value: number;
				length: number;
				endValue: number;
			}[],
		): Promise<void>;
		onSelected(item: Item, causedBy: Event): void;
		onFocused(item: Item): void;
		onCreate(value: number): void;
		oncontextmenu?(e: MouseEvent, items: Item[]): void;
		additionalSettings: Snippet<[]>;
	}

	const {
		namespacedWritable,
		groups,
		display,

		items: inputItems,
		selectValue,
		selectLength,
		previewItem,
		summarizeItem,
		pendingGroupUpdates,
		openDialog,

		onPreviewNewItemValue,
		itemsResizable,
		onItemsResized,
		oncontextmenu,
		onSelected,
		onFocused,
		onCreate,

		additionalSettings,
	}: Props = $props();

	const focalValue = namespacedWritable.make("focalValue", 0);
	const persistedValuePerPixel = namespacedWritable.make("scale", 1);

	let plotarea = $state<null | CanvasStage<T, TimelineItem<T>>>(null);
	const fitBounds = $derived(plotarea?.fitBounds());

	function scaleStore(initialScale: Scale = new ValuePerPixelScale(1)) {
		function atLeastMinimum(value: Scale) {
			const valuePerPixel = value.toValue(1);
			const minimum = 1 / 100;
			if (Number.isNaN(valuePerPixel)) {
				return new ValuePerPixelScale(minimum);
			}
			return new ValuePerPixelScale(Math.max(minimum, valuePerPixel));
		}

		const { subscribe, set } = makeWritable(atLeastMinimum(initialScale));

		return {
			subscribe,
			set: (newValue: Scale) => {
				const validated = atLeastMinimum(newValue);
				set(validated);
				$persistedValuePerPixel = validated.valuePerPixel;
				return validated;
			},
		};
	}

	const timelineItems = $derived(inputItems.map(timelineItem));
	const valued = $derived.by(() => {
		const items = timelineItems;
		const valueOf = selectValue;
		const lengthOf = selectLength;

		items.forEach((it) => {
			let value = valueOf(it.source);
			let length = lengthOf(it.source);
			if (length < 0) {
				value = value + length;
				length = -length;
			}
			untrack(() => {
				it.setValue(value);
				it.setLength(length);
			});
		});

		return {
			items: items,
			_: Math.random(),
		};
	});
	async function resizeItems(
		detail: {
			item: TimelineItem<T>;
			value: number;
			length: number;
			endValue: number;
		}[],
	) {
		await onItemsResized(
			detail.map((it) => {
				let value = it.value;
				let length = it.length;
				let endValue = it.endValue;

				const currentLength = selectLength(it.item.source);

				if (currentLength < 0) {
					length = -length;
					value = endValue;
					endValue = it.value;
				}

				return {
					item: it.item.source,
					value,
					length,
					endValue,
				};
			}),
		);
		detail.forEach((it) => it.item.setValue(it.value));
		detail.forEach((it) => it.item.setLength(it.length));
	}

	const sorted = $derived.by(() => {
		return {
			items: valued.items.sort((a, b) => a.value() - b.value()),
			_: Math.random(),
		};
	});

	const scale = scaleStore(new ValuePerPixelScale($persistedValuePerPixel));
	$effect(() => {
		$scale = new ValuePerPixelScale($persistedValuePerPixel);
	});

	const navigation: TimelineNavigation<T> = timelineNavigation(
		scale,
		{
			get() {
				return sorted.items;
			},
		},
		(updater) => {
			const newFocalValue = updater($focalValue);
			if (newFocalValue != $focalValue) {
				$focalValue = newFocalValue;
			}
		},
		() => fitBounds!,
	);

	let needsZoomToFit = $state(false);
	export function zoomToFit() {
		if (initialized) {
			navigation.zoomToFit(timelineItems, fitBounds);
		} else {
			needsZoomToFit = true;
		}
	}

	$effect(() => {
		if (needsZoomToFit && fitBounds == null) {
			needsZoomToFit = false;
			navigation.zoomToFit(timelineItems, fitBounds);
		}
	});

	export function refresh() {
		// items = items;
	}

	export function focusOnId(id: string) {
		plotarea?.focusOnId(id);
	}

	export function invalidateColors() {
		// canvasStage.invalidateColors();
	}

	let initialized = false;
	$effect(() => {
		if (!initialized) {
			if (fitBounds != null) {
				initialized = true;
			}
		}
	});

	let rulerHeight = $state(0);
	const mode = namespacedWritable?.make("mode", "edit");

	const settingsOpen = namespacedWritable
		.namespace("settings")
		.make("isOpen", false);
	const settingsCollapable = new ObservableCollapsable(!$settingsOpen);
	settingsCollapable.onChange = () => {
		$settingsOpen = !settingsCollapable.isCollapsed();
	};

	const groupsSectionCollapsed = namespacedWritable
		.namespace("settings")
		.namespace("groups")
		.make("collapsed", true);

	function openHelpDialog() {
		openDialog((modal) => {
			modal.modalEl.addClass("timeline-help");
			modal.titleEl.setText("Timeline Help");
			const component = mount(TimelineInteractionsHelp, {
				target: modal.contentEl,
				props: {},
			});

			return () => unmount(component);
		});
	}
</script>

<div
	class="timeline"
	style:--ruler-height="{rulerHeight}px"
	style:--plotarea-client-width="{plotarea?.clientWidth() ?? 0}px"
>
	<css-wrapper class="ruler">
		<TimelineRuler
			{display}
			scale={$scale}
			focalValue={$focalValue}
			bind:clientHeight={rulerHeight}
		/>
	</css-wrapper>
	<css-wrapper class="plotarea">
		<CanvasStage
			bind:this={plotarea}
			previewItem={(item, name, value, length, endValue) => {
				const currentLength = selectLength(item.source);

				if (currentLength < 0) {
					return previewItem(name, endValue, -length, value);
				}
				return previewItem(name, value, length, endValue);
			}}
			summarizeItem={(it) => summarizeItem(it.source)}
			sortedItems={sorted.items}
			scale={$scale}
			focalValue={$focalValue}
			editable={mode != null ? $mode === "edit" : false}
			{itemsResizable}
			on:scrollToValue={(event) => navigation.scrollToValue(event.detail)}
			on:scrollX={({ detail }) =>
				navigation.scrollToValue($focalValue + detail)}
			on:zoomIn={({ detail }) => navigation.zoomIn(detail)}
			on:zoomOut={({ detail }) => navigation.zoomOut(detail)}
			on:select={({ detail }) =>
				onSelected(detail.item.source, detail.causedBy)}
			on:focus={({ detail }) => onFocused(detail.source)}
			on:create={({ detail }) => onCreate(detail.value)}
			onItemsChanged={resizeItems}
			onPreviewNewItemValue={(item, value) =>
				onPreviewNewItemValue(item.source, value)}
			oncontextmenu={!oncontextmenu
				? undefined
				: (e, items) => {
						oncontextmenu(
							e,
							items.map((it) => it.source),
						);
					}}
		/>
	</css-wrapper>
	<menu class="timeline-controls">
		<TimelineNavigationControls {navigation} />
		<TimelineSettings collapsable={settingsCollapable}>
			{@render additionalSettings()}
			<TimelineGroupsSettingsSection
				bind:collapsed={$groupsSectionCollapsed}
				{groups}
				{pendingGroupUpdates}
			/>
		</TimelineSettings>
		<div class="control-group">
			<ActionButton
				class="clickable-icon control-item"
				on:action={openHelpDialog}
			>
				<LucideIcon id="help" />
			</ActionButton>
		</div>
	</menu>
</div>

<style>
	.timeline {
		background-color: var(--background);
	}

	css-wrapper {
		display: contents;
	}
	css-wrapper.ruler {
		--border-color: var(--ruler-border-color);
		--border-width: var(--ruler-border-width);

		--label-padding: var(--ruler-label-padding);
		--label-font-size: var(--ruler-label-font-size);
		--label-font-weight: var(--ruler-label-font-weight);
		--label-border-color: var(--ruler-label-border-color);
		--label-border-width: var(--ruler-label-border-width);
	}
	css-wrapper.plotarea {
		--padding-top: var(--plotarea-padding-top);
		--padding-left: var(--plotarea-padding-left);
		--padding-bottom: var(--plotarea-padding-bottom);
		--padding-right: var(--plotarea-padding-right);

		--background-line-color: var(--plotarea-background-line-color);
		--background-line-width: var(--plotarea-background-line-width);
		--background-line-dash-on: var(--plotarea-background-line-dash-on);
		--background-line-dash-off: var(--plotarea-background-line-dash-off);
	}

	/*! Positioning */
	:global(.timeline-controls) {
		position: absolute;
		top: var(--ruler-height);
		margin-top: var(--size-4-2);
		margin-right: var(--size-4-2);
		right: calc(100% - var(--plotarea-client-width));
	}
	/*! Icon sizing */
	:global(.timeline-controls) {
		--icon-size: var(--icon-s);
		--icon-stroke: var(--icon-s-stroke-width);
	}
	/*! Menu padding overrides  */
	:global(menu.timeline-controls) {
		padding: 0;
	}

	/*! Internal layout */
	:global(.timeline-controls) {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		align-items: flex-end;
	}
	:global(.timeline-controls > *) {
		margin: 0;
	}

	/*! Item styling */
	:global(.timeline-controls > *) {
		border-radius: var(--radius-s);
		background-color: var(--timeline-settings-background);
		border: 1px solid var(--background-modifier-border);
		box-shadow: var(--input-shadow);
		box-sizing: border-box;
	}
	:global(.timeline-controls > * > *) {
		background-color: var(--timeline-settings-background);
	}

	:global(.timeline-settings-groups-section) {
		position: relative;
	}

	.control-group :global(.control-item) {
		padding: var(--timeline-settings-button-padding);
	}

	.control-group :global(button.control-item.clickable-icon) {
		background-color: var(--interactive-normal);
	}
	.control-group :global(button.control-item.clickable-icon:hover) {
		background-color: var(--interactive-normal);
	}

	div menu {
		pointer-events: none;
	}
	div menu > :global(*) {
		pointer-events: all;
	}

	div {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
</style>
