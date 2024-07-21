<script lang="ts">
	import { type TimelineNavigation } from "./controls/TimelineNavigation";
	import {
		timelineDateValueDisplay,
		type TimelineItem,
		timelineNumericValueDisplay,
	} from "./Timeline";
	import { writable as makeWritable, writable } from "svelte/store";
	import { timelineNavigation } from "./controls/TimelineNavigation";
	import TimelineRuler from "./layout/ruler/TimelineRuler.svelte";
	import type { NamespacedWritableFactory } from "./Persistence";
	import CanvasStage from "./layout/stage/CanvasStage.svelte";
	import type { TimelineViewModel } from "./viewModel";
	import { ValuePerPixelScale, type Scale } from "./scale";
	import TimelineNavigationControls from "./controls/TimelineNavigationControls.svelte";
	import TimelineSettings from "./controls/settings/TimelineSettings.svelte";

	export let namespacedWritable: NamespacedWritableFactory<TimelineViewModel>;
	export let displayPropertyAs: "numeric" | "date";

	const focalValue = namespacedWritable.make("focalValue", 0);
	const persistedValuePerPixel = namespacedWritable.make("scale", 1);

	let unsortedItems: TimelineItem[] = [];
	export { unsortedItems as items };

	let sortedItems: TimelineItem[] = [];
	$: sortedItems = unsortedItems.toSorted((a, b) => a.value() - b.value());

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
				return sortedItems;
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

	export function zoomToFit(items?: readonly TimelineItem[]) {
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
		sortedItems = sortedItems;
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

	$: display =
		displayPropertyAs === "date"
			? timelineDateValueDisplay()
			: timelineNumericValueDisplay();

	let rulerHeight = 0;
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
		{sortedItems}
		scale={$scale}
		focalValue={$focalValue}
		bind:width={$stageWidth}
		bind:clientWidth={stageClientWidth}
		on:scrollToValue={(event) => navigation.scrollToValue(event.detail)}
		on:scrollX={({ detail }) =>
			navigation.scrollToValue($focalValue + detail)}
		on:zoomIn={({ detail }) => navigation.zoomIn(detail)}
		on:zoomOut={({ detail }) => navigation.zoomOut(detail)}
		on:select
		on:focus
	/>
	<menu class="timeline-controls">
		<TimelineNavigationControls {navigation} />
		<TimelineSettings
			namespacedWritable={namespacedWritable.namespace("settings")}
		>
			<slot name="additional-settings" />
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
