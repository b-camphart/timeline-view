<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { type RulerValueDisplay } from "../../Timeline";
	import RulerLabel from "./RulerLabel.svelte";
	import type { Scale } from "src/timeline/scale";
	import Playhead from "./Playhead.svelte";

	export let display: RulerValueDisplay | undefined;
	export let scale: Scale;
	export let focalValue: number;

	let width: number = 0;
	let height: number = 0;
	export { height as clientHeight };
	const dispatch = createEventDispatcher<{
		mouseMeasurement: { value: string; x: number } | undefined;
	}>();

	function getLabelCount(stepWidth: number, fullWidth: number) {
		if (stepWidth === 0) {
			return 0;
		}
		return Math.ceil(fullWidth / stepWidth) + 1;
	}

	function getFirstLabelValue(
		focalValue: number,
		scale: Scale,
		labelStepValue: number,
		width: number,
	) {
		const valueOnLeftSide = focalValue - scale.toValue(width / 2);
		if (labelStepValue === 0) {
			return valueOnLeftSide;
		}
		return Math.floor(valueOnLeftSide / labelStepValue) * labelStepValue;
	}

	$: labelStepValue = display?.getSmallestLabelStepValue(scale) ?? 0;
	$: labelStepWidth = scale.toPixels(labelStepValue);
	$: labelCount = getLabelCount(labelStepWidth, width);

	$: firstLabelValue = getFirstLabelValue(
		focalValue,
		scale,
		labelStepValue,
		width,
	);

	$: labels =
		display?.labels(labelCount, labelStepValue, firstLabelValue) ?? [];

	let mousePosition: { value: string; x: number } | undefined;

	function onMeasureMouseLocation(
		event: MouseEvent & { currentTarget: HTMLDivElement },
	) {
		const x =
			event.clientX - event.currentTarget.getBoundingClientRect().left;

		const distanceToCenter = width / 2 - x;

		let value = Math.floor(focalValue - scale.toValue(distanceToCenter));
		if (Object.is(value, -0)) {
			value = 0;
		}
		if (display) {
			mousePosition = { value: display.displayValue(value), x };
			dispatch("mouseMeasurement", mousePosition);
		}
	}

	function stopMeasureMouseLocation(event: MouseEvent) {
		mousePosition = undefined;
		dispatch("mouseMeasurement", mousePosition);
	}
</script>

<div
	class="ruler"
	style="--label-width:{labelStepWidth}px;"
	bind:clientWidth={width}
	bind:clientHeight={height}
	on:mousemove={onMeasureMouseLocation}
	on:mouseleave={stopMeasureMouseLocation}
	role="slider"
	aria-valuemin={Number.NEGATIVE_INFINITY}
	aria-valuemax={Number.POSITIVE_INFINITY}
	aria-valuenow={focalValue}
	tabindex="0"
>
	{#if mousePosition != null}
		<Playhead x={mousePosition.x} label={mousePosition.value} />
	{/if}
	<RulerLabel
		text={"1234567890-:/APM"}
		position={0}
		style="position:relative;visibility:hidden;"
	/>
	{#each labels as label (label.value)}
		<RulerLabel
			text={label.text}
			position={scale.toPixels(label.value - focalValue) + width / 2}
		/>
	{/each}
</div>

<style>
	@property --timeline-ruler-background {
		syntax: "<color>";
		inherits: true;
	}
	@property --timeline-ruler-size {
		syntax: "<length>";
		inherits: true;
	}

	:global(.ruler) {
		background-color: var(
			--timeline-ruler-background,
			var(--timeline-background)
		);
		height: var(--timeline-ruler-size, auto);
	}
	div {
		width: 100%;
		position: relative;
		overflow-x: hidden;
	}
	.ruler :global(.min-height) {
		position: relative;
		visibility: hidden;
		width: 100%;
	}
</style>
