<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import { type RulerValueDisplay } from "../../Timeline"
	import RulerLabel from "./RulerLabel.svelte";

	export let display: RulerValueDisplay;
	export let valuePerPixel: number;
	export let focalValue: number;

	let width: number = 0;
    const dispatch = createEventDispatcher<{mouseMeasurement: { value: string, x: number } | undefined}>();

	function getLabelCount(stepWidth: number, fullWidth: number) {
		return Math.ceil(fullWidth / stepWidth) + 1;
	}

	function getFirstLabelValue(focalValue: number, valuePerPixel: number, labelStepValue: number) {
		const valueOnLeftSide = focalValue - ((width / 2) * valuePerPixel);
		return Math.floor(valueOnLeftSide / labelStepValue) * labelStepValue;
	}

	$: labelStepValue = display.getSmallestLabelStepValue(valuePerPixel);
	$: labelStepWidth = labelStepValue / valuePerPixel;
	$: labelCount = getLabelCount(labelStepWidth, width);

	$: firstLabelValue = getFirstLabelValue(focalValue, valuePerPixel, labelStepValue);

	$: labels = display.labels(labelCount, labelStepValue, firstLabelValue);

    let mousePosition: { value: string, x: number } | undefined;

    function onMeasureMouseLocation(event: MouseEvent) {
        const maybeRuler = event.currentTarget as HTMLElement
        if (maybeRuler == null || !('getBoundingClientRect' in maybeRuler)) {
            return;
        }
        let currentTargetRect = maybeRuler.getBoundingClientRect();
        const x = (event.pageX - currentTargetRect.left);
		const distanceToCenter = (width / 2) - x;

		
        let value = Math.floor(focalValue - (distanceToCenter * valuePerPixel))
        if (Object.is(value, -0)) {
            value = 0;
        }
        mousePosition = { value: display.displayValue(value), x };
        dispatch("mouseMeasurement", mousePosition)
    }

    function stopMeasureMouseLocation(event: MouseEvent) {
        mousePosition = undefined;
        dispatch("mouseMeasurement", mousePosition)
    }

	let mousePositionTooltipWidth: number;

</script>

<div
    class="ruler"
    style="--label-width:{labelStepWidth}px;"
	bind:clientWidth={width}
    on:mousemove|capture={onMeasureMouseLocation}
    on:mouseleave={stopMeasureMouseLocation}
    role="slider"
    aria-valuemin={Number.NEGATIVE_INFINITY}
    aria-valuemax={Number.POSITIVE_INFINITY}
    aria-valuenow={focalValue}
    tabindex="0"
>
	<RulerLabel class="measurement" text={"1234567890-:/APM"} position={0}/>
	{#each labels as label (label.value)}
		<RulerLabel text={label.text} position={((label.value - focalValue) / valuePerPixel) + (width / 2)}/>
	{/each}
</div>
{#if mousePosition != null}
    <div class="mouse-position-tooltip" bind:clientWidth={mousePositionTooltipWidth} style="right:{Math.min(width - mousePosition.x, width - mousePositionTooltipWidth)}px;">
        {mousePosition.value}
    </div>
{/if}

<style>
    .mouse-position-tooltip {
        top: 0;
        position: absolute;
        pointer-events: none;
		display: block;
		white-space: nowrap;
    }
	.ruler {
		width: 100%;
        position:relative;
		overflow-x: hidden;
	}
	.ruler :global(.measurement) {
		position: relative;
		visibility: hidden;
		width: 100%;
	}
</style>
