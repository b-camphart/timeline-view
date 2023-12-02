<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import { PointBounds, renderStage } from "./CanvasStage";
	import type { TimelineItem } from "../../Timeline";

	interface Scale {
		toPixels(value: number): number;
		toValue(pixels: number): number;
	}

	type ZoomEvent = {
		keepValue: number;
		at: number;
		within: number;
	};
	const dispatch = createEventDispatcher<{
		scrollX: number;
		zoomIn: ZoomEvent;
		zoomOut: ZoomEvent;
		select: { item: TimelineItem; causedBy: Event };
	}>();

	export let sortedItems: TimelineItem[];
	$: sortedItems.find((_, index) => {
		if (index === 0) {
			console.log("Stage received new sorted items")
		}
	})
	export let scale: Scale;
	export let focalValue: number;
	export let width: number = 0;

	let canvas: HTMLCanvasElement | undefined;
	const pointElements: (HTMLDivElement | undefined)[] = [
		undefined,
		undefined,
		undefined,
	]
	let stageCSSTarget: HTMLDivElement | undefined;
	let canvasTop = 0;

	const viewport = {
		width: 0,
		height: 0,
		centerValue: 0,
		padding: 0,
	};

	$: if (viewport.centerValue != focalValue) {
		changesNeeded = true;
		viewport.centerValue = focalValue;
	}

	let pointStyle: CSSStyleDeclaration | undefined;
	const pointDimentions = {
		width: 0,
		marginX: 0,
		marginY: 0,
	};

	let changesNeeded = true;

	function onPointsOrScaleChanged(points: TimelineItem[], scale: Scale) {
		changesNeeded = true;
	}
	$: onPointsOrScaleChanged(sortedItems, scale);

	const resizeObserver = new ResizeObserver(() => {
		if (
			canvas == null ||
			pointElements.some(el => el == null) ||
			stageCSSTarget == null
		) {
			return;
		}

		if (canvasTop != stageCSSTarget.offsetTop) {
			canvasTop = stageCSSTarget.offsetTop;
		}

		changesNeeded =
			changesNeeded ||
			viewport.width != stageCSSTarget.clientWidth ||
			viewport.height != stageCSSTarget.clientHeight ||
			viewport.padding !=
				stageCSSTarget.clientWidth - stageCSSTarget.innerWidth ||
			pointDimentions.width != pointElements[0]!.clientWidth;

		viewport.width = stageCSSTarget.clientWidth;
		viewport.height = stageCSSTarget.clientHeight;
		viewport.padding =
			stageCSSTarget.clientWidth -
			stageCSSTarget.innerWidth +
			pointElements[0]!.clientWidth;
		pointDimentions.width = pointElements[0]!.clientWidth;
		pointDimentions.marginX = Math.max(
			0,
			pointElements[1]!.offsetLeft - (pointElements[0]!.offsetLeft + pointElements[0]!.clientWidth),
		);
		pointDimentions.marginY = Math.max(
			0,
			pointElements[2]!.offsetTop - (pointElements[0]!.offsetTop + pointElements[0]!.clientHeight),
		);

		const reportedWidth = viewport.width - viewport.padding;

		if (width != reportedWidth) {
			width = reportedWidth;
		}
	});

	function handleScroll(event: WheelEvent) {
		if (event.shiftKey) {
			dispatch(`scrollX`, scale.toValue(event.deltaY));
		} else if (event.ctrlKey) {
			const xRelativeToMiddle = event.offsetX - viewport.width / 2;
			const zoomFocusValue =
				focalValue + scale.toValue(xRelativeToMiddle);

			if (event.deltaY > 0) {
				dispatch(`zoomOut`, {
					keepValue: zoomFocusValue,
					at: xRelativeToMiddle,
					within: viewport.width,
				});
			} else if (event.deltaY < 0) {
				dispatch(`zoomIn`, {
					keepValue: zoomFocusValue,
					at: xRelativeToMiddle,
					within: viewport.width,
				});
			}
		}
	}

	function handleClick(event: MouseEvent) {
		if (hover == null) return;
		dispatch("select", { item: hover.item, causedBy: event });
	}

	let pointBounds: PointBounds[] = [];
	let hover: PointBounds | null = null;

	function detectHover(event: MouseEvent) {
		for (const bounds of pointBounds) {
			if (bounds.contains(event.offsetX, event.offsetY)) {
				hover = bounds;
				return;
			}
		}
		hover = null;
	}

	onMount(() => {
		if (canvas == null || pointElements.some(el => el == null) || stageCSSTarget == null) {
			return;
		}

		resizeObserver.observe(canvas);
		resizeObserver.observe(pointElements[0]!);
		resizeObserver.observe(stageCSSTarget);

		pointStyle = getComputedStyle(pointElements[0]!);

		function draw() {
			if (canvas == null) return;
			if (canvas.width != viewport.width) canvas.width = viewport.width;
			if (canvas.height != viewport.height)
				canvas.height = viewport.height;
			const renderContext = canvas.getContext("2d");
			if (renderContext == null) return;
			if (changesNeeded) {
				renderContext.fillStyle = pointStyle!.backgroundColor;
				pointBounds = [];
				for (const pointBound of renderStage.call(
					renderContext,
					viewport,
					pointDimentions,
					scale,
					sortedItems,
				)) {
					pointBounds.push(pointBound);
				}
				changesNeeded = false;
			}
			requestAnimationFrame(draw);
		}

		requestAnimationFrame(draw);
	});
</script>

<canvas
	bind:this={canvas}
	style={`top: ${canvasTop}px;`}
    class:has-hover={hover != null}
	on:wheel|stopPropagation|capture={handleScroll}
	on:mousemove={detectHover}
	on:click={handleClick}
/>
{#if hover != null}
	<div
		class="timeline-point hover"
		style="top: {hover.y + canvasTop}px; left: {hover.x}px;"
	>
		<div class="display-name">{hover.item.name()}: {hover.item.value()}</div>
	</div>
{/if}
<div class="stage" bind:this={stageCSSTarget}>
	<div class="timeline-point" bind:this={pointElements[0]} style="float: left;"></div>
	<div class="timeline-point" bind:this={pointElements[1]} style="clear: right;"></div>
	<div class="timeline-point" bind:this={pointElements[2]}></div>
</div>

<style>
	canvas {
		position: absolute;
	}
    canvas.has-hover {
        cursor: pointer;
    }
	.stage {
		visibility: hidden;
		padding: var(--timeline-stage-side-padding);
	}

	.timeline-point {
		border-radius: 50%;
		width: var(--point-diameter);
		height: var(--point-diameter);
		margin: var(--margin-between-points, 4px);
	}

	.timeline-point.hover {
		position: absolute;
		margin: 0;
        pointer-events: none;
	}
</style>
