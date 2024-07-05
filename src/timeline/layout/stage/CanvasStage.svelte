<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import {
		PointBounds,
		renderStage,
		layoutPoints,
		renderLayout,
	} from "./CanvasStage";
	import type { TimelineItem, ValueDisplay } from "../../Timeline";

	// initially get created with nothing loaded yet
	// get populated with sorted items, the scale, focal value, and a value display
	//

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

	export let display: ValueDisplay;
	export let sortedItems: TimelineItem[];
	export let scale: Scale;
	export let focalValue: number;
	export let width: number = 0;

	let canvas: HTMLCanvasElement | undefined;
	const pointElements: (HTMLDivElement | undefined)[] = [
		undefined,
		undefined,
		undefined,
	];
	let stageCSSTarget: HTMLDivElement | undefined;
	let canvasTop = 0;

	const viewport = {
		width: 0,
		height: 0,
		centerValue: 0,
		padding: 0,
		scrollTop: 0,
	};

	$: if (viewport.centerValue != focalValue) {
		layoutNeeded = true;
		viewport.centerValue = focalValue;
	}

	let pointStyle: CSSStyleDeclaration | undefined;
	const pointDimentions = {
		width: 0,
		marginX: 0,
		marginY: 0,
	};

	let layoutNeeded = true;
	let redrawNeeded = true;

	const resizeObserver = new ResizeObserver(() => {
		if (
			canvas == null ||
			pointElements.some((el) => el == null) ||
			stageCSSTarget == null
		) {
			return;
		}

		if (canvasTop != stageCSSTarget.offsetTop) {
			canvasTop = stageCSSTarget.offsetTop;
		}

		layoutNeeded =
			layoutNeeded ||
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
			pointElements[1]!.offsetLeft -
				(pointElements[0]!.offsetLeft + pointElements[0]!.clientWidth),
		);
		pointDimentions.marginY = Math.max(
			0,
			pointElements[2]!.offsetTop -
				(pointElements[0]!.offsetTop + pointElements[0]!.clientHeight),
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
		} else {
			const newScroll = Math.max(0, viewport.scrollTop + event.deltaY);
			if (viewport.scrollTop != newScroll) {
				viewport.scrollTop = newScroll;
				layoutNeeded = true;
			}
		}
	}

	function handleClick(event: MouseEvent) {
		if (hover == null) return;
		dispatch("select", { item: hover.bounds.item, causedBy: event });
	}

	let pointBounds: PointBounds[] = [];
	let hover: { bounds: PointBounds; pos: [number, number] } | null = null;

	function detectHover(event: { offsetX: number; offsetY: number }) {
		for (const bounds of pointBounds) {
			if (bounds.contains(event.offsetX, event.offsetY)) {
				hover = { bounds, pos: [event.offsetX, event.offsetY] };
				return;
			}
		}
		hover = null;
	}

	function onPointsOrScaleChanged(points: TimelineItem[], scale: Scale) {
		layoutNeeded = true;
	}
	$: onPointsOrScaleChanged(sortedItems, scale);

	function onFocalValueChanged(_: number) {
		redrawNeeded = true;
	}
	$: onFocalValueChanged(focalValue);

	export function invalidateColors() {
		redrawNeeded = true;
	}

	let scrollbarMeasurerFullWidth: number = 0;
	let scrollbarMeasurerInnerWidth: number = 0;
	$: scrollbarWidth =
		scrollbarMeasurerFullWidth - scrollbarMeasurerInnerWidth;
	let vScrollbarNeeded = false;
	let vPercent = 1;
	let vScrollValue = 0;

	let scrollbarMeasurerFullHeight: number = 0;
	let scrollbarMeasurerInnerHeight: number = 0;
	$: scrollbarHeight =
		scrollbarMeasurerFullHeight - scrollbarMeasurerInnerHeight;
	let hScrollbarNeeded = false;
	let hPercent = 1;
	let hScrollValue = 0;

	onMount(() => {
		if (
			canvas == null ||
			pointElements.some((el) => el == null) ||
			stageCSSTarget == null
		) {
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

			if (layoutNeeded) {
				pointBounds = Array.from(
					layoutPoints(viewport, pointDimentions, scale, sortedItems),
				);

				let minX = 0;
				let maxX = viewport.width;
				let maxY = 0;
				for (const bounds of pointBounds) {
					if (bounds.left < minX) minX = bounds.left;
					if (bounds.right > maxX) maxX = bounds.right;
					if (bounds.bottom > maxY) maxY = bounds.bottom;
				}
				const maxScroll = Math.max(
					0,
					maxY + pointDimentions.marginY - viewport.height,
				);
				if (viewport.scrollTop > maxScroll)
					viewport.scrollTop = maxScroll;

				for (const bounds of pointBounds) {
					bounds.centerY = bounds.centerY - viewport.scrollTop;
				}

				// set scrollbar thumb size
				if (viewport.height >= maxY) {
					vScrollbarNeeded = false;
				} else {
					vScrollbarNeeded = true;
					vPercent = viewport.height / maxY;
					vScrollValue = viewport.scrollTop / maxScroll;
				}

				const totalDisplayWidth = maxX - minX;
				if (
					viewport.width >= totalDisplayWidth &&
					minX >= 0 &&
					maxX <= viewport.width
				) {
					hScrollbarNeeded = false;
				} else {
					hScrollbarNeeded = true;
					hPercent = viewport.width / totalDisplayWidth;
					hScrollValue =
						Math.abs(minX) / (totalDisplayWidth - viewport.width);
				}
			}

			if (redrawNeeded || layoutNeeded) {
				renderContext.fillStyle = pointStyle!.backgroundColor;
				renderLayout(
					renderContext,
					viewport,
					pointDimentions,
					pointBounds,
				);
				if (hover != null) {
					detectHover({
						offsetX: hover.pos[0],
						offsetY: hover.pos[1],
					});
				}
			}
			layoutNeeded = false;
			redrawNeeded = false;

			requestAnimationFrame(draw);
		}

		requestAnimationFrame(draw);
	});
</script>

<canvas bind:this={canvas} style={`top: ${canvasTop}px;`} />
<div
	class="stage"
	role="presentation"
	bind:this={stageCSSTarget}
	class:has-hover={hover != null}
	on:wheel|stopPropagation|capture={handleScroll}
	on:mousemove={detectHover}
	on:click={handleClick}
	on:keypress={() => {}}
>
	<div
		class="timeline-point"
		bind:this={pointElements[0]}
		style="float: left;"
	></div>
	<div
		class="timeline-point"
		bind:this={pointElements[1]}
		style="clear: right;"
	></div>
	<div class="timeline-point" bind:this={pointElements[2]}></div>
	<div
		role="scrollbar"
		style:height={scrollbarHeight + "px"}
		class:unneeded={!hScrollbarNeeded}
		aria-orientation="horizontal"
		aria-controls={canvas?.className ?? ""}
		aria-valuenow={focalValue}
	>
		<div
			class="thumb"
			style="--percent: {hPercent}; --value: {hScrollValue};"
		/>
	</div>
	<div
		role="scrollbar"
		style:width={scrollbarWidth + "px"}
		class:unneeded={!vScrollbarNeeded}
		aria-orientation="vertical"
		aria-controls={canvas?.className ?? ""}
		aria-valuenow={viewport.scrollTop}
	>
		<div
			class="thumb"
			style="--percent: {vPercent}; --value: {vScrollValue};"
		/>
	</div>
</div>
<div
	bind:clientHeight={scrollbarMeasurerInnerHeight}
	bind:clientWidth={scrollbarMeasurerInnerWidth}
	bind:offsetHeight={scrollbarMeasurerFullHeight}
	bind:offsetWidth={scrollbarMeasurerFullWidth}
	class="scrollbar-style-meausurer"
	style="position: absolute; top: 0; left: 0; width: 100px; height: 100px;overflow: scroll;visibility: hidden;"
></div>

{#if hover != null}
	<div
		class="timeline-point hover"
		style="top: {hover.bounds.y + canvasTop}px; left: {hover.bounds.x}px;"
	>
		<div class="display-name">
			{hover.bounds.item.name()}: {display.displayValue(
				hover.bounds.item.value(),
			)}
		</div>
	</div>
{/if}

<style>
	canvas {
		position: absolute;
	}
	.stage.has-hover {
		cursor: pointer;
	}
	.stage {
		position: relative;
		padding: var(--timeline-stage-side-padding);
		--scrollbar-width: var(--size-4-1);
	}
	.stage .timeline-point {
		visibility: hidden !important;
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

	div[role="scrollbar"] {
		position: absolute;
		background-color: var(--scrollbar-bg, transparent);
	}
	div[role="scrollbar"].unneeded {
		visibility: hidden;
	}
	div[role="scrollbar"] .thumb {
		position: absolute;

		background-color: var(
			--scrollbar-thumb-bg,
			var(--ui1, rbga(256, 256, 256, 0.2))
		);

		background-clip: padding-box;
		border-radius: 20px;
		border: 3px solid transparent;
		border-width: 3px 3px 3px 3px;
	}
	div[role="scrollbar"] .thumb:hover {
		background-color: var(
			--scrollbar-active-thumb-bg,
			var(--ui3, rbga(256, 256, 256, 0.4))
		);
	}
	div[role="scrollbar"][aria-orientation="horizontal"] {
		width: 100%;
		bottom: 0;
		left: 0;
	}
	div[role="scrollbar"][aria-orientation="horizontal"] .thumb {
		min-width: 45px;
		height: 100%;
		--thumb-width: calc(100% * var(--percent, 1));
		width: var(--thumb-width);
		left: calc(calc(100% - var(--thumb-width)) * var(--value, 0));
	}
	div[role="scrollbar"][aria-orientation="vertical"] {
		height: 100%;
		top: 0;
		right: 0;
	}
	div[role="scrollbar"][aria-orientation="vertical"] .thumb {
		min-height: 45px;
		width: 100%;
		--thumb-height: calc(100% * var(--percent, 1));
		height: var(--thumb-height);
		top: calc(calc(100% - var(--thumb-height)) * var(--value, 0));
	}
</style>
