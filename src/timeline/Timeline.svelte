<script lang="ts">
	import TimelineControls from "./controls/TimelineControls.svelte";
	import { type TimelineNavigation } from "./controls/TimelineNavigation";
	import {
		timelineDateValueDisplay,
		type TimelineItem,
		timelineNumericValueDisplay,
	} from "./Timeline";
	import { writable as makeWritable, readonly } from "svelte/store";
	import { timelineNavigation } from "./controls/TimelineNavigation";
	import TimelineRuler from "./layout/ruler/TimelineRuler.svelte";
	import type { NamespacedWritableFactory } from "./Persistence";
	import CanvasStage from "./layout/stage/CanvasStage.svelte";
	import { setTimeout } from "timers";

	export let namespacedWritable: NamespacedWritableFactory | undefined = undefined;
	export let displayDataPointNames: boolean;
	export let displayPropertyAs: "numeric" | "date";
	export let focalValue: number = 0
	export let scale: number = 1;

	let sortedItems: TimelineItem[] = []
	let unsortedItems: TimelineItem[] = []
	function sortItems() {
		return unsortedItems.toSorted((a, b) => a.value() - b.value())
	}
	let sortTimeout: ReturnType<typeof setTimeout> | undefined;
	function scheduleSortUpdate() {
		if (sortTimeout != null) return;

		sortTimeout = setTimeout(() => {
			sortTimeout = undefined
			sortedItems = sortItems()
		}, 250)
	}

	export function addItem(item: TimelineItem) {
		unsortedItems.push(item)
		scheduleSortUpdate()
	}

	export function removeItem(item: TimelineItem) {
		unsortedItems.remove(item)
		scheduleSortUpdate()
	}

	export function modifyItemValue(id: string, value: number) {
		scheduleSortUpdate()
	}

	export function replaceItems(replacements: TimelineItem[]) {
		unsortedItems = replacements
		sortedItems = sortItems()
	}

	export function renameItem(id: string, name: string) {
		// no op
	}

	function valuePerPixelStore(initialValue: number = 1) {
		function atLeastMinimum(value: number) {
			const minimum = 1 / 64;
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
				scale = validated;
				return validated;
			},
		};
	}

	const valuePerPixel = valuePerPixelStore(scale);
	$: $valuePerPixel = scale;

	let stageWidth: number;
	

	const navigation: TimelineNavigation = timelineNavigation(
		valuePerPixel, 
		{ get() { return sortedItems } },
		(updater) => {
			const newFocalValue = updater(focalValue)
			if (newFocalValue != focalValue) {
				focalValue = newFocalValue
			}
		}, 
		() => stageWidth
	);

	export function zoomToFit() {
		navigation.zoomToFit();
	}

	let initialized = false;
	$: if (!initialized) {
		if (stageWidth > 0) {
			navigation.zoomToFit();
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
		{focalValue}
	/>
	<CanvasStage
		{display}
		{sortedItems}
		scale={{
			toPixels(value) {
				return Math.floor(value / $valuePerPixel)
			},
			toValue(pixels) {
				return $valuePerPixel * pixels
			}
		}}
		{focalValue}
		bind:width={stageWidth}
		on:scrollX={({ detail }) => navigation.scrollToValue(focalValue + detail)}
		on:zoomIn={({ detail }) => navigation.zoomIn(detail)}
		on:zoomOut={({ detail }) => navigation.zoomOut(detail)}
		on:select
	/>
	<TimelineControls
		namespacedWritable={namespacedWritable?.namespace("controls")}
		bind:displayDataPointNames
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
