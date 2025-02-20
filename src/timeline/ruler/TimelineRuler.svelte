<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import RulerLabel from "./RulerLabel.svelte";
	import type { Scale } from "src/timeline/scale";
	import Playhead from "./Playhead.svelte";
	import {
		DisplayType,
		formatLabel,
		generateLabels,
		step,
	} from "src/timeline/ruler/labels";

	let width: number = $state(0);
	interface Props {
		displayType: DisplayType;
		scale: Scale;
		focalValue: number;
		clientHeight?: number;
	}

	let {
		displayType,
		scale,
		focalValue,
		clientHeight: height = $bindable(0),
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		mouseMeasurement: { value: string; x: number } | undefined;
	}>();

	// function getLabelCount(stepWidth: number, fullWidth: number) {
	// 	if (stepWidth === 0) {
	// 		return 0;
	// 	}
	// 	return Math.ceil(fullWidth / stepWidth) + 1;
	// }

	// function getFirstLabelValue(
	// 	focalValue: number,
	// 	scale: Scale,
	// 	labelStepValue: number,
	// 	width: number,
	// ) {
	// 	const valueOnLeftSide = focalValue - scale.toValue(width / 2);
	// 	if (labelStepValue === 0) {
	// 		return valueOnLeftSide;
	// 	}
	// 	return Math.floor(valueOnLeftSide / labelStepValue) * labelStepValue;
	// }

	// let labelStepValue = $derived(
	// 	display?.getSmallestLabelStepValue(scale) ?? 0,
	// );
	// let labelStepWidth = $derived(scale.toPixels(labelStepValue));

	// let labelCount = $derived(getLabelCount(labelStepWidth, width));

	// let firstLabelValue = $derived(
	// 	getFirstLabelValue(focalValue, scale, labelStepValue, width),
	// );

	// let labels = $derived(
	// 	display?.labels(labelCount, labelStepValue, firstLabelValue) ?? [],
	// );

	function positionOf(label: { value: number }) {}

	let mousePosition: { value: string; x: number } | undefined = $state();

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
		mousePosition = {
			value: formatLabel(displayType, scale.toValue(1), value),
			x,
		};
		dispatch("mouseMeasurement", mousePosition);
	}

	function stopMeasureMouseLocation(event: MouseEvent) {
		mousePosition = undefined;
		dispatch("mouseMeasurement", mousePosition);
	}

	let measuringLabel = $state<RulerLabel>();
	const minLabelSize = $derived(measuringLabel?.size() ?? 192);

	const stepValue = $derived(step(displayType, minLabelSize, scale));
	const labels = $derived.by(() => {
		$inspect.trace("generating labels");
		const valueOfWidth = scale.toValue(width);
		return generateLabels(
			displayType,
			stepValue,
			focalValue - valueOfWidth / 2,
			focalValue + valueOfWidth / 2,
		);
	});

	export function minValueStep() {
		return stepValue;
	}
</script>

<div
	class="timeline-view--ruler"
	data-min-value-step={stepValue}
	bind:clientWidth={width}
	bind:clientHeight={height}
	onmousemove={onMeasureMouseLocation}
	onmouseleave={stopMeasureMouseLocation}
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
		bind:this={measuringLabel}
		text={"MMM DD, YYYY HH:mm:ss.SSS AM"}
		position={0}
		style="position:relative;"
		hidden
	/>
	{#each labels as labelValue}
		<RulerLabel
			text={formatLabel(displayType, stepValue, labelValue)}
			position={scale.toPixels(labelValue - focalValue) + width / 2}
		/>
	{/each}
</div>

<style>
	div {
		border-bottom: var(--border-color) var(--border-width) solid;
		width: 100%;
		position: relative;
	}
</style>
