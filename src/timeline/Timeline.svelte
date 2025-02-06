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
	import type { TimelineGroups } from "src/timeline/group/groups";
	import TimelineGroupsList from "src/timeline/group/TimelineGroupsList.svelte";
	import {
		type ComponentProps,
		mount,
		type Snippet,
		unmount,
		untrack,
	} from "svelte";
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
		groupEvents: Omit<ComponentProps<typeof TimelineGroupsList>, "groups">;
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
		groupEvents,
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

	const stageWidth = writable(0);
	let stageClientWidth = $state(0);

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

		items.forEach((it) => {
			const value = valueOf(it.source);
			untrack(() => it.setValue(value));
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
			detail.map((it) => ({ ...it, item: it.item.source })),
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
	const measured = $derived.by(() => {
		const sortedItems = sorted.items;
		const lengthOf = selectLength;

		sortedItems.forEach((it) => {
			const length = lengthOf(it.source);
			untrack(() => it.setLength(length));
		});

		return {
			items: sortedItems,
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
				return measured.items;
			},
		},
		(updater) => {
			const newFocalValue = updater($focalValue);
			if (newFocalValue != $focalValue) {
				$focalValue = newFocalValue;
			}
		},
		() => $stageWidth,
	);

	export function zoomToFit() {
		if (initialized) {
			navigation.zoomToFit(timelineItems, $stageWidth);
		} else {
			const unsubscribe = stageWidth.subscribe((newStageWidth) => {
				if (newStageWidth > 0) {
					navigation.zoomToFit(timelineItems, newStageWidth);
					unsubscribe();
				}
			});
		}
	}

	export function refresh() {
		// items = items;
	}

	export function focusOnId(id: string) {
		canvasStage.focusOnId(id);
	}

	let canvasStage: CanvasStage<T, TimelineItem<T>>;
	export function invalidateColors() {
		// canvasStage.invalidateColors();
	}

	let initialized = false;
	$effect(() => {
		if (!initialized) {
			if ($stageWidth > 0) {
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
	const groupsSectionCollapable = new ObservableCollapsable(
		$groupsSectionCollapsed,
	);
	groupsSectionCollapable.onChange = () => {
		$groupsSectionCollapsed = groupsSectionCollapable.isCollapsed();
	};

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
	style:--stage-client-width="{stageClientWidth}px"
>
	<TimelineRuler
		{display}
		scale={$scale}
		focalValue={$focalValue}
		bind:clientHeight={rulerHeight}
	/>
	<CanvasStage
		bind:this={canvasStage}
		{previewItem}
		summarizeItem={(it) => summarizeItem(it.source)}
		sortedItems={measured.items}
		scale={$scale}
		focalValue={$focalValue}
		bind:width={$stageWidth}
		bind:clientWidth={stageClientWidth}
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
	<menu class="timeline-controls">
		<TimelineNavigationControls {navigation} />
		<TimelineSettings collapsable={settingsCollapable}>
			{@render additionalSettings()}
			<TimelineGroupsSettingsSection
				collapsable={groupsSectionCollapable}
				{groups}
				{pendingGroupUpdates}
				{...groupEvents}
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
	@property --timeline-background {
		syntax: "<color>";
		inherits: true;
		initial-value: darkgrey;
	}

	:global(.timeline) {
		background-color: var(--timeline-background);
	}

	/*! Positioning */
	:global(.timeline-controls) {
		position: absolute;
		top: var(--ruler-height);
		margin-top: var(--size-4-2);
		margin-right: var(--size-4-2);
		right: calc(100% - var(--stage-client-width));
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
