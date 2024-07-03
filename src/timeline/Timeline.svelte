<script lang="ts">
	import TimelineControls from "./controls/TimelineControls.svelte";
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

	export let namespacedWritable:
		| NamespacedWritableFactory<TimelineViewModel>
		| undefined = undefined;
	export let displayPropertyAs: "numeric" | "date";

	const focalValue =
		namespacedWritable?.make("focalValue", 0) ?? makeWritable(0);
	const scale = namespacedWritable?.make("scale", 1) ?? makeWritable(1);

	let unsortedItems: TimelineItem[] = [];
	export { unsortedItems as items };

	let sortedItems: TimelineItem[] = [];
	$: sortedItems = unsortedItems.toSorted((a, b) => a.value() - b.value());

	function valuePerPixelStore(initialValue: number = 1) {
		function atLeastMinimum(value: number) {
			const minimum = 1 / 100;
			if (Number.isNaN(value)) {
				return minimum;
			}
			return Math.max(minimum, value);
		}

		const { subscribe, set } = makeWritable(atLeastMinimum(initialValue));

		return {
			subscribe,
			set: (newValue: number) => {
				const validated = atLeastMinimum(newValue);
				set(validated);
				$scale = validated;
				return validated;
			},
		};
	}

	const valuePerPixel = valuePerPixelStore($scale);
	$: $valuePerPixel = $scale;

	const stageWidth = writable(0);

	const navigation: TimelineNavigation = timelineNavigation(
		valuePerPixel,
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
			const unsubscribe = stageWidth.subscribe(newStageWidth => {
				if (newStageWidth > 0) {
					navigation.zoomToFit(items, newStageWidth)
					unsubscribe()
				}
			})
		}
	}

	export function refresh() {
		sortedItems = sortedItems
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
</script>

<div class="timeline">
	<TimelineRuler
		{display}
		valuePerPixel={$valuePerPixel}
		focalValue={$focalValue}
	/>
	<CanvasStage
		{display}
		{sortedItems}
		scale={{
			toPixels(value) {
				return Math.floor(value / $valuePerPixel);
			},
			toValue(pixels) {
				return $valuePerPixel * pixels;
			},
		}}
		focalValue={$focalValue}
		bind:width={$stageWidth}
		on:scrollX={({ detail }) =>
			navigation.scrollToValue($focalValue + detail)}
		on:zoomIn={({ detail }) => navigation.zoomIn(detail)}
		on:zoomOut={({ detail }) => navigation.zoomOut(detail)}
		on:select
	/>
	<TimelineControls
		namespacedWritable={namespacedWritable?.namespace("settings")}
		{navigation}
	>
		<svelte:fragment slot="additional-settings">
			<slot name="additional-settings" />
		</svelte:fragment>
	</TimelineControls>
</div>

<style>
	.timeline {
		height: 100%;
		--point-radius: 8px;
		--point-diameter: calc(var(--point-radius) * 2);
		--timeline-stage-side-padding: 32px;
		display: flex;
		flex-direction: column;
	}
	.timeline :global(.ruler) {
		flex-grow: 0;
	}
	.timeline :global(.stage) {
		flex-grow: 1;
	}
</style>
