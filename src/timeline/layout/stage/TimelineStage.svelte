<script lang="ts" generics="T">
	import type { TimelineNavigation } from "../../controls/TimelineNavigation";

	import { createEventDispatcher, onDestroy, onMount } from "svelte";
	import { layoutPoints, type TimelineItem, type ValueDisplay } from "../../Timeline";
	import TimelinePoint from "./TimelinePoint.svelte"

	const dispatch = createEventDispatcher<{
		selectItem: { item: TimelineItem; causedBy?: Event };
	}>();

	export let display: ValueDisplay;
	export let navigation: TimelineNavigation;
	export let mouseMeasurement: { value: string; x: number } | undefined;

	export let valuePerPixel: number;
	export let focalValue: number;

	export let items: TimelineItem[];

	export let displayNames: boolean;

	let pointDiameter: number = 16;
	$: pointRadius = pointDiameter / 2;
	const marginBetweenPoints: number = 4;

	$: sortedItems = items.toSorted((a, b) => a.value() - b.value());
	$: displayItems = layoutPoints(
		sortedItems,
		valuePerPixel,
		pointRadius,
		marginBetweenPoints
	);

	let stageInnerWidth: number = 0;
	export { stageInnerWidth as width };
	let stageWidth: number = 0;

	let stage: HTMLDivElement;
	const innerWidthObserver = new ResizeObserver(() => {
		stageInnerWidth =
			stage.clientWidth - (stage.scrollWidth - stage.innerWidth);
	});
	onMount(() => {
		stageInnerWidth =
			stage.clientWidth - (stage.scrollWidth - stage.innerWidth);
		innerWidthObserver.observe(stage);
	});
	onDestroy(() => {
		innerWidthObserver.disconnect();
	});

	function handleScroll(event: WheelEvent) {
		if (event.shiftKey) {
			navigation.scrollToValue(focalValue + (event.deltaY * valuePerPixel));
		}
		if (event.ctrlKey) {
			const xRelativeToMiddle = event.offsetX - (stageWidth / 2)
			const zoomFocusValue = focalValue + xRelativeToMiddle * valuePerPixel;

			if (event.deltaY > 0) {
				navigation.zoomOut({
					keepValue: zoomFocusValue,
					at: xRelativeToMiddle,
					within: stageWidth,
				});
			} else if (event.deltaY < 0) {
				navigation.zoomIn({
					keepValue: zoomFocusValue,
					at: xRelativeToMiddle,
					within: stageWidth,
				});
			}
		}
	}

	function itemClicked(event: MouseEvent) {
		const renderedItem = event.target;
		if (
			renderedItem == null ||
			!("tabIndex" in renderedItem) ||
			typeof renderedItem.tabIndex !== "number"
		) {
			return;
		}
		const item = sortedItems[renderedItem.tabIndex];
		dispatch("selectItem", { item, causedBy: event });
	}

	function keyDownOnItem(event: KeyboardEvent) {
		const renderedItem = event.target;
		if (
			renderedItem == null ||
			!("tabIndex" in renderedItem) ||
			typeof renderedItem.tabIndex !== "number"
		) {
			return;
		}
		const item = sortedItems[renderedItem.tabIndex];
		if (event.key === "Enter") {
			dispatch("selectItem", { item, causedBy: event });
		}
	}

	$: centerX = stageWidth / 2;
	$: focalValueOffset = focalValue / valuePerPixel;
	$: pointOffset = focalValueOffset - centerX;
</script>

<div
	class="stage"
	style="--margin-between-points: {marginBetweenPoints}px;"
	bind:this={stage}
	bind:clientWidth={stageWidth}
	on:wheel|stopPropagation|passive|capture={handleScroll}
>
	{#if mouseMeasurement != null}
		<div class="measurement" style="left:{mouseMeasurement.x}px;" />
	{/if}
	<TimelinePoint 
		tabindex={-1}
		name=""
		value=""
		style="visibility: hidden;disabled: true;"
		displayName={displayNames}
		bind:measuredWidth={pointDiameter}
	/>
	{#each displayItems as item, itemIndex (item.id())}
		<TimelinePoint
			tabindex={itemIndex}
			name={item.name()}
			value={display.displayValue(item.value())}
			style="top:{item.positionY()}px;left:{item.positionX() - pointOffset}px;"
			displayName={displayNames}
			on:click={itemClicked}
			on:keydown={keyDownOnItem}
		/>
	{/each}
</div>

<style>
	.stage {
		position: relative;
		width: 100%;
		overflow-x: hidden;
		padding: 0 calc(var(--timeline-stage-side-padding) + var(--point-radius));
	}
	.stage .measurement {
		border-left: dashed var(--divider-color) 2px;
		position: relative;
		top: 0;
		bottom: 0;
		height: 100%;
		margin-left: calc(calc(var(--timeline-stage-side-padding) + var(--point-radius)) * -1);
	}
	.stage :global(.timeline-point) {
		position: absolute;
	}
</style>
