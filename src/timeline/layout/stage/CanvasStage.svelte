<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import { layoutPoints, renderLayout } from "./CanvasStage";
	import type { TimelineItem, ValueDisplay } from "../../Timeline";
	import {
		TimelineItemElement,
		TimelineLayoutItem,
	} from "src/timeline/layout/stage/TimelineItemElement";

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
		scrollToValue: number;
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

	let innerWidth = 0;
	let innerHeight = 0;
	const viewport = {
		width: 0,
		height: 0,
		padding: {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		},
		scrollTop: 0,
	};

	let pointStyle: CSSStyleDeclaration | undefined;
	const item = {
		width: 0,
		height: 0,
		margin: {
			horizontal: 0,
			vertical: 0,
		},
	};

	let layoutNeeded = true;
	let scrollNeeded = true;
	let redrawNeeded = true;

	const resizeObserver = new ResizeObserver((a) => {
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

		item.width = pointElements[0]!.clientWidth;
		item.height = pointElements[0]!.clientHeight;
		item.margin.horizontal = Math.max(
			0,
			pointElements[1]!.offsetLeft -
				(pointElements[0]!.offsetLeft + item.width),
		);
		item.margin.vertical = Math.max(
			0,
			pointElements[2]!.offsetTop -
				(pointElements[0]!.offsetTop + item.height),
		);

		viewport.padding.top = Math.max(
			0,
			pointElements[0]!.offsetTop - item.margin.vertical,
		);
		viewport.padding.left = Math.max(
			0,
			pointElements[0]!.offsetLeft - item.margin.horizontal,
		);
		viewport.padding.right =
			stageCSSTarget.clientWidth - viewport.padding.left - innerWidth;
		viewport.padding.bottom =
			stageCSSTarget.clientHeight - viewport.padding.top - innerHeight;

		viewport.width = stageCSSTarget.clientWidth;
		viewport.height = stageCSSTarget.clientHeight;

		const reportedWidth =
			viewport.width -
			viewport.padding.left -
			viewport.padding.right -
			item.width -
			item.margin.horizontal;

		if (width != reportedWidth) {
			width = reportedWidth;
		}

		layoutNeeded = true;
	});

	function handleScroll(event: WheelEvent) {
		if (event.shiftKey) {
			dispatch("scrollX", scale.toValue(event.deltaY));
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
			const newScroll = Math.max(0, scrollTop + event.deltaY);
			if (scrollTop != newScroll) {
				scrollTop = newScroll;
				scrollNeeded = true;
			}
		}
	}

	function handleClick(event: MouseEvent) {
		if (hover == null || hover.element == null) return;
		dispatch("select", {
			item: hover.element.layoutItem.item,
			causedBy: event,
		});
	}

	let elements: TimelineItemElement[] = [];
	let hover: {
		element: TimelineItemElement;
		pos: [number, number];
	} | null = null;

	function detectHover(event: { offsetX: number; offsetY: number }) {
		if (!vScrollDrag && !hScrollDrag) {
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i];
				if (element.contains(event.offsetX, event.offsetY)) {
					hover = {
						element: element,
						pos: [event.offsetX, event.offsetY],
					};
					return;
				}
			}
		}
		hover = null;
	}

	function onPointsOrScaleChanged(points: TimelineItem[], scale: Scale) {
		layoutNeeded = true;
	}
	$: onPointsOrScaleChanged(sortedItems, scale);

	function onFocalValueChanged(_: number) {
		scrollNeeded = true;
	}
	$: onFocalValueChanged(focalValue);

	export function invalidateColors() {
		redrawNeeded = true;
	}

	let scrollTop = 0;
	function onScrollTopChanged(_: number) {
		scrollNeeded = true;
	}
	$: onScrollTopChanged(scrollTop);

	let scrollHeight = 0;
	let scrollbarMeasurerFullWidth: number = 0;
	let scrollbarMeasurerInnerWidth: number = 0;
	$: scrollbarWidth =
		scrollbarMeasurerFullWidth - scrollbarMeasurerInnerWidth;
	let vScrollbarNeeded = false;
	let vPercent = 1;
	/**
	 * a percentage between 0 and 1, representing how far down the user has scrolled of the maximum scroll height
	 */
	let vScrollValue = 0;
	let vScrollDrag = false;
	let hScrollDrag = false;
	function onVScrollThumbMouseDown(
		event: MouseEvent & { currentTarget: HTMLDivElement },
	) {
		vScrollDrag = true;
		const xStart = event.screenX;
		const yStart = event.screenY;
		const scrollTopStart = scrollTop;
		const mouseMoveListener = (event: MouseEvent) => {
			if (Math.abs(event.screenX - xStart) > 150) {
				scrollTop = 0;
				return;
			}

			scrollTop = scrollTopStart + (event.screenY - yStart) / vPercent;
		};
		window.addEventListener("mousemove", mouseMoveListener);
		const mouseUpListener = () => {
			vScrollDrag = false;
			window.removeEventListener("mousemove", mouseMoveListener);
			window.removeEventListener("mouseup", mouseUpListener);
		};
		window.addEventListener("mouseup", mouseUpListener);
	}

	let minScrollValue = 0;
	let maxScrollValue = 0;
	let scrollValueSpan = 0;
	let scrollbarMeasurerFullHeight: number = 0;
	let scrollbarMeasurerInnerHeight: number = 0;
	$: scrollbarHeight =
		scrollbarMeasurerFullHeight - scrollbarMeasurerInnerHeight;
	let hScrollbarNeeded = false;
	let hPercent = 1;
	let hScrollValue = 0;
	function onHScrollThumbMouseDown(
		event: MouseEvent & { currentTarget: HTMLDivElement },
	) {
		hScrollDrag = true;
		const xStart = event.screenX;
		const yStart = event.screenY;
		const focalValueStart = focalValue;

		const limits = {
			min: minScrollValue,
			max: maxScrollValue,
		};

		const hPercentStart = hPercent;

		const mouseMoveListener = (event: MouseEvent) => {
			if (Math.abs(event.screenY - yStart) > 150) {
				dispatch("scrollToValue", focalValueStart);
				return;
			}
			dispatch(
				"scrollToValue",
				Math.max(
					limits.min,
					Math.min(
						limits.max,
						focalValueStart +
							scale.toValue(event.screenX - xStart) /
								hPercentStart,
					),
				),
			);
		};
		window.addEventListener("mousemove", mouseMoveListener);
		const mouseUpListener = () => {
			hScrollDrag = false;
			scrollNeeded = true;
			window.removeEventListener("mousemove", mouseMoveListener);
			window.removeEventListener("mouseup", mouseUpListener);
		};
		window.addEventListener("mouseup", mouseUpListener);
	}

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

		function draw(layout: TimelineLayoutItem[] = []) {
			if (canvas == null) return;
			if (canvas.width != viewport.width) canvas.width = viewport.width;
			if (canvas.height != viewport.height)
				canvas.height = viewport.height;
			const renderContext = canvas.getContext("2d");
			if (renderContext == null) return;

			if (layoutNeeded) {
				layout = layoutPoints(
					viewport,
					item,
					scale,
					sortedItems,
					layout,
				);

				if (layout.length > 0) {
					scrollHeight = 0;
					for (const bounds of layout) {
						scrollHeight = Math.max(
							scrollHeight,
							bounds.bottom() +
								item.margin.vertical +
								viewport.padding.bottom,
						);
					}
				} else {
					scrollHeight = 0;
				}
			}

			if (scrollNeeded || layoutNeeded) {
				if (elements.length > layout.length) {
					elements = elements.slice(0, layout.length);
				}

				const scrollLeft =
					scale.toPixels(focalValue) - viewport.width / 2;

				const maxScrollY = scrollHeight - viewport.height;
				scrollTop = Math.max(
					0,
					Math.min(scrollTop, scrollHeight - viewport.height),
				);

				for (let i = 0; i < layout.length; i++) {
					const item = layout[i];

					const element =
						elements[i] ?? new TimelineItemElement(item);
					element.layoutItem = item;
					element.offsetCenterX = item.centerX - scrollLeft;
					element.offsetCenterY = item.centerY - scrollTop;
					element.offsetLeft = element.offsetCenterX - item.radius;
					element.offsetTop = element.offsetCenterY - item.radius;
					element.offsetWidth = item.radius * 2;
					element.offsetHeight = item.radius * 2;
					element.offsetRight =
						element.offsetLeft + element.offsetWidth;
					element.offsetBottom =
						element.offsetTop + element.offsetHeight;

					elements[i] = element;
				}

				if (viewport.height >= scrollHeight) {
					vScrollbarNeeded = false;
				} else {
					vScrollbarNeeded = true;
					vPercent = viewport.height / scrollHeight;
					vScrollValue = scrollTop / maxScrollY;
				}

				const viewportWidthValue = scale.toValue(viewport.width);
				const halfViewportWidthValue = viewportWidthValue / 2;
				const leftValue = focalValue - halfViewportWidthValue;
				const rightValue = focalValue + halfViewportWidthValue;

				const leftMostValue =
					(sortedItems[0]?.value() ?? 0) -
					scale.toValue(viewport.padding.left + item.width / 2);

				const rightMostValue =
					(sortedItems[sortedItems.length - 1]?.value() ?? 0) +
					scale.toValue(viewport.padding.right + item.width / 2);

				if (leftValue < leftMostValue && rightValue > rightMostValue) {
					hScrollbarNeeded = false;
				} else {
					hScrollbarNeeded = true;

					/*
					 Now, we need to define the range that the h scrollbar can move between
					 Think of this as the value ranget that the focalValue (center of the viewport) can move between
					 
					 the furthest left the focalValue can be scrolled BY THE SROLLBAR is the first value minus the pointRadius and padding, plus the value of half the viewport width.

					 the furthest right the focalValue can be scrolled BY THE SROLLBAR is the last value plus the pointRadius and padding, minus the value of half the viewport width.

					 However, if the focalValue is already beyond those points, then the scrollbar can be scrolled to the current focalValue.
					*/

					minScrollValue = Math.min(
						focalValue,
						leftMostValue + halfViewportWidthValue,
					);

					maxScrollValue = Math.max(
						focalValue,
						rightMostValue - halfViewportWidthValue,
					);

					scrollValueSpan = maxScrollValue - minScrollValue;

					/** How much does the value span within the viewport cover the total amount of scrollable space? */
					hPercent =
						viewportWidthValue /
						(scrollValueSpan + viewportWidthValue);

					/** What percent is the focalValue along the available scrollable space? */
					hScrollValue =
						(focalValue - minScrollValue) / scrollValueSpan;
				}
				if (hover != null) {
					detectHover({
						offsetX: hover.pos[0],
						offsetY: hover.pos[1],
					});
				}
			}

			if (redrawNeeded || scrollNeeded || layoutNeeded) {
				renderContext.fillStyle = pointStyle!.backgroundColor;
				renderLayout(renderContext, viewport, item, elements);
			}
			layoutNeeded = false;
			scrollNeeded = false;
			redrawNeeded = false;

			requestAnimationFrame(() => draw(layout));
		}

		requestAnimationFrame(() => draw());
	});
</script>

<div
id="stage"
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
		class="bottom-right-padding-measure"
		bind:offsetWidth={innerWidth}
		bind:offsetHeight={innerHeight}
		></div>
	<canvas bind:this={canvas} />
	<div
		role="scrollbar"
		style:height={scrollbarHeight + "px"}
		class:unneeded={!hScrollbarNeeded}
		aria-orientation="horizontal"
		aria-controls={"stage"}
		aria-valuenow={focalValue}
		aria-valuemin={Number.MIN_VALUE}
		aria-valuemax={Number.MAX_VALUE}
	>
		<div
			role="presentation"
			on:mousedown={onHScrollThumbMouseDown}
			class="thumb"
			class:dragging={hScrollDrag}
			style="--percent: {hPercent}; --value: {hScrollValue};"
		/>
	</div>
	<div
		role="scrollbar"
		style:width={scrollbarWidth + "px"}
		class:unneeded={!vScrollbarNeeded}
		aria-orientation="vertical"
		aria-controls={"stage"}
		aria-valuenow={viewport.scrollTop}
		aria-valuemax={scrollHeight - viewport.height}
	>
		<div
			role="presentation"
			on:mousedown={onVScrollThumbMouseDown}
			class="thumb"
			class:dragging={vScrollDrag}
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
		style="top: {hover.element.offsetTop + canvasTop}px; left: {hover
			.element.offsetLeft}px;"
	>
		<div class="display-name">
			{hover.element.layoutItem.item.name()}: {display.displayValue(
				hover.element.layoutItem.item.value(),
			)}
		</div>
	</div>
{/if}

<style>
	canvas {
		position: absolute;
		top: 0;
		left: 0;
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
	.stage .bottom-right-padding-measure {
		width: 1005;
		height: 100%;
		visibility: hidden !important;
		pointer-events: none;
		bottom: 0;
		right: 0;
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
	div[role="scrollbar"] .thumb:hover,
	div[role="scrollbar"] .thumb.dragging {
		background-color: var(
			--scrollbar-active-thumb-bg,
			var(--ui3, rbga(256, 256, 256, 0.4))
		);
		/* background-color: white; */
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
