<script lang="ts">
	import { type TimelineNavigation } from "./controls/TimelineNavigation";
	import { type TimelineItem } from "./Timeline";
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
	import type { ComponentProps } from "svelte";
	import { SortedArray } from "src/utils/collections";
	import TimelineGroupsSettingsSection from "src/timeline/group/TimelineGroupsSettingsSection.svelte";
	import { ObservableCollapsable } from "src/view/collapsable";

	export let namespacedWritable: NamespacedWritableFactory<TimelineViewModel>;
	export let groups: TimelineGroups;
	export let groupEvents: Omit<ComponentProps<TimelineGroupsList>, "groups">;
	export let display: RulerValueDisplay;

	const focalValue = namespacedWritable.make("focalValue", 0);
	const persistedValuePerPixel = namespacedWritable.make("scale", 1);

	export let items: SortedArray<TimelineItem>;
	export let pendingGroupUpdates: number;

	export let onPreviewNewItemValue: (
		item: TimelineItem,
		value: number,
	) => number = (_, value) => value;
	export let onMoveItem: (
		item: TimelineItem,
		value: number,
	) => boolean = () => true;
	export let oncontextmenu: (
		e: MouseEvent,
		items: TimelineItem[],
	) => void = () => {};

	const stageWidth = writable(0);
	let stageClientWidth = 0;

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

	const scale = scaleStore(new ValuePerPixelScale($persistedValuePerPixel));
	$: $scale = new ValuePerPixelScale($persistedValuePerPixel);

	const navigation: TimelineNavigation = timelineNavigation(
		scale,
		{
			get() {
				return items;
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

	export function zoomToFit(items?: SortedArray<TimelineItem>) {
		if (initialized) {
			navigation.zoomToFit(items, $stageWidth);
		} else {
			const unsubscribe = stageWidth.subscribe((newStageWidth) => {
				if (newStageWidth > 0) {
					navigation.zoomToFit(items, newStageWidth);
					unsubscribe();
				}
			});
		}
	}

	export function refresh() {
		items = items;
	}

	export function focusOnItem(item: TimelineItem) {
		canvasStage.focusOnItem(item);
	}

	let canvasStage: CanvasStage;
	export function invalidateColors() {
		canvasStage.invalidateColors();
	}

	let initialized = false;
	$: if (!initialized) {
		if ($stageWidth > 0) {
			initialized = true;
		}
	}

	function moveItems(
		event: CustomEvent<{ item: TimelineItem; value: number }[]>,
	) {
		event.detail.forEach(({ item, value }) => {
			if (!onMoveItem(item, value)) {
				return;
			}
			item.value = () => value;
		});
		items = new SortedArray((item) => item.value(), ...items);
	}

	let rulerHeight = 0;
	$: mode = namespacedWritable?.make("mode", "edit");

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
		{display}
		sortedItems={items}
		scale={$scale}
		focalValue={$focalValue}
		bind:width={$stageWidth}
		bind:clientWidth={stageClientWidth}
		editable={mode != null ? $mode === "edit" : false}
		on:scrollToValue={(event) => navigation.scrollToValue(event.detail)}
		on:scrollX={({ detail }) =>
			navigation.scrollToValue($focalValue + detail)}
		on:zoomIn={({ detail }) => navigation.zoomIn(detail)}
		on:zoomOut={({ detail }) => navigation.zoomOut(detail)}
		on:select
		on:focus
		on:create
		on:moveItems={moveItems}
		{onPreviewNewItemValue}
		{oncontextmenu}
	/>
	<menu class="timeline-controls">
		<TimelineNavigationControls {navigation} />
		<TimelineSettings collapsable={settingsCollapable}>
			<slot name="additional-settings" />
			<TimelineGroupsSettingsSection
				collapsable={groupsSectionCollapable}
				{groups}
				{pendingGroupUpdates}
				{...groupEvents}
			/>
		</TimelineSettings>
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
