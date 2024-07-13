<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import { layoutPoints, renderLayout } from "./CanvasStage";
	import type { TimelineItem, ValueDisplay } from "../../Timeline";
	import {
		TimelineItemElement,
		TimelineLayoutItem,
	} from "src/timeline/layout/stage/TimelineItemElement";
	import { type Scale } from "src/timeline/scale";
	import Scrollbar from "src/view/controls/Scrollbar.svelte";
	import type { ChangeEvent } from "src/view/controls/Scrollbar";

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

		// if it's completely minimized, no use recalculating everything, since
		// none of it will be visible anyway.  Also, avoids resetting the
		// scroll height to 0.
		if (
			stageCSSTarget.offsetHeight === 0 &&
			stageCSSTarget.offsetWidth === 0
		) {
			return;
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

		(viewport.padding.top = Math.max(
			0,
			pointElements[0]!.offsetTop - item.margin.vertical,
		)),
			(viewport.padding.left = Math.max(
				0,
				pointElements[0]!.offsetLeft - item.margin.horizontal,
			)),
			(viewport.padding.right =
				stageCSSTarget.clientWidth -
				viewport.padding.left -
				innerWidth),
			(viewport.padding.bottom =
				stageCSSTarget.clientHeight -
				viewport.padding.top -
				innerHeight),
			(viewport.width = stageCSSTarget.clientWidth);
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

	let scrollbarDragging = false;
	function detectHover(event: { offsetX: number; offsetY: number }) {
		if (!scrollbarDragging) {
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
	let visibleVAmount = 0;

	let scrollbarMeasurerFullWidth: number = 0;
	let scrollbarMeasurerInnerWidth: number = 0;
	$: scrollbarWidth =
		scrollbarMeasurerFullWidth - scrollbarMeasurerInnerWidth;
	let scrollbarMeasurerFullHeight: number = 0;
	let scrollbarMeasurerInnerHeight: number = 0;
	$: scrollbarHeight =
		scrollbarMeasurerFullHeight - scrollbarMeasurerInnerHeight;

	let hScrollValue = 0;
	let visibleHAmount = viewport.width;
	let minHScrollValue = 0;
	let maxHScrollValue = 0;

	function handleHScroll(event: ChangeEvent) {
		dispatch(
			"scrollToValue",
			focalValue +
				scale.toValue(event.detail.deltaPixels) / event.detail.ratio,
		);
	}

	function handleVScroll(event: ChangeEvent) {
		scrollTop = event.detail.value;
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

				scrollTop = Math.max(
					0,
					Math.min(scrollTop, scrollHeight - viewport.height),
				);
				visibleVAmount = viewport.height;

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

				visibleHAmount = scale.toValue(viewport.width);
				hScrollValue = focalValue - scale.toValue(viewport.width / 2);

				const leftMostValue =
					(sortedItems[0]?.value() ?? 0) -
					scale.toValue(viewport.padding.left + item.width / 2);

				const rightMostValue =
					(sortedItems[sortedItems.length - 1]?.value() ?? 0) -
					scale.toValue(viewport.padding.left + item.width / 2);

				minHScrollValue = Math.min(
					focalValue - scale.toValue(viewport.width / 2),
					leftMostValue,
				);

				maxHScrollValue = Math.max(
					focalValue + scale.toValue(viewport.width / 2),
					rightMostValue,
				);

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

	let tooltip: HTMLDivElement | undefined;
	$: if (hover != null) {
		if (tooltip == null) {
			tooltip = document.createElement("div");
			document.body.appendChild(tooltip);
			tooltip.className = "tooltip";

			tooltip.innerText = `${hover.element.layoutItem.item.name()}: ${display.displayValue(hover.element.layoutItem.item.value())}`;

			const tooltipArrow = document.createElement("div");
			tooltipArrow.className = "tooltip-arrow";
			tooltip.appendChild(tooltipArrow);

			tooltip.setCssStyles({
				translate: `0 ${tooltipArrow.offsetHeight}px`,
			});
		}

		tooltip.setCssStyles({
			top: `${hover.element.offsetBottom + (stageCSSTarget?.getBoundingClientRect()?.top ?? 0)}px`,
			left: `${hover.element.offsetCenterX + (stageCSSTarget?.getBoundingClientRect()?.left ?? 0)}px`,
		});
	} else {
		if (tooltip != null) {
			tooltip.remove();
			tooltip = undefined;
		}
	}
</script>

<div
	id="stage"
	class="stage"
	bind:this={stageCSSTarget}
	class:has-hover={hover != null}
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
	<canvas
		bind:this={canvas}
		tabindex={0}
		on:wheel|stopPropagation|capture={handleScroll}
		on:mousemove={detectHover}
		on:click={handleClick}
		on:keydown={(event) => {
			switch (event.key) {
				case "ArrowLeft":
					dispatch("scrollX", scale.toValue(-1));
					break;
				case "ArrowRight":
					dispatch("scrollX", scale.toValue(1));
					break;
				case "ArrowUp":
					scrollTop = Math.max(0, scrollTop - 10);
					break;
				case "ArrowDown":
					scrollTop = Math.min(
						scrollHeight - viewport.height,
						scrollTop + 10,
					);
					break;
				case "PageUp":
					scrollTop = Math.max(0, scrollTop - viewport.height);
					break;
				case "PageDown":
					scrollTop = Math.min(
						scrollHeight - viewport.height,
						scrollTop + viewport.height,
					);
					break;
				case "Home":
					scrollTop = 0;
					break;
				case "End":
					scrollTop = scrollHeight - viewport.height;
					break;
			}
		}}
	/>
	{#if hover != null}
		<div
			class="timeline-point hover"
			aria-label="{hover.element.layoutItem.item.name()}: {display.displayValue(
				hover.element.layoutItem.item.value(),
			)}"
			style="top: {hover.element.offsetTop}px; left: {hover.element
				.offsetLeft}px;"
		></div>
	{/if}
	<Scrollbar
		style={`height: ${scrollbarHeight}px;`}
		orientation={"horizontal"}
		controls={"stage"}
		tabindex={1}
		value={hScrollValue}
		visibleAmount={visibleHAmount}
		min={minHScrollValue}
		max={maxHScrollValue}
		on:change={handleHScroll}
		on:dragstart={() => {
			scrollbarDragging = true;
		}}
		on:dragend={() => {
			scrollbarDragging = false;
		}}
	/>
	<Scrollbar
		style={`width: ${scrollbarWidth}px;`}
		orientation={"vertical"}
		controls={"stage"}
		tabindex={2}
		value={scrollTop}
		visibleAmount={visibleVAmount}
		min={0}
		max={scrollHeight}
		on:change={handleVScroll}
		on:dragstart={() => {
			scrollbarDragging = true;
		}}
		on:dragend={() => {
			scrollbarDragging = false;
		}}
	/>
</div>
<div
	bind:clientHeight={scrollbarMeasurerInnerHeight}
	bind:clientWidth={scrollbarMeasurerInnerWidth}
	bind:offsetHeight={scrollbarMeasurerFullHeight}
	bind:offsetWidth={scrollbarMeasurerFullWidth}
	class="scrollbar-style-measurer"
></div>

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
	.stage .timeline-point:not(.hover) {
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

	.scrollbar-style-measurer {
		position: absolute;
		top: 0;
		left: 0;
		width: 100px;
		height: 100px;
		overflow: scroll;
		visibility: hidden;
	}

	.stage :global([role="scrollbar"]) {
		position: absolute;
	}
	.stage :global([role="scrollbar"][aria-orientation="horizontal"]) {
		bottom: 0;
		left: 0;
		width: 100%;
	}
	.stage :global([role="scrollbar"][aria-orientation="vertical"]) {
		top: 0;
		right: 0;
		height: 100%;
	}
</style>
