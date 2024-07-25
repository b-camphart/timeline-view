<script lang="ts">
	import { createEventDispatcher, onMount } from "svelte";
	import { layoutPoints, renderLayout } from "./CanvasStage";
	import type { TimelineItem, ValueDisplay } from "../../Timeline";
	import {
		TimelineItemElement,
		TimelineLayoutItem,
		type OffsetBox,
	} from "src/timeline/layout/stage/TimelineItemElement";
	import { type Scale } from "src/timeline/scale";
	import Scrollbar from "src/view/controls/Scrollbar.svelte";
	import type { ChangeEvent } from "src/view/controls/Scrollbar";
	import Hover from "./Hover.svelte";
	import FocusedItem from "./FocusedItem.svelte";
	import { Platform } from "obsidian";

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
		focus: TimelineItem;
		create: { value: number };
		/** Cancelable.  Called just before 'on:itemMoved' */
		moveItem: { item: TimelineItem; value: number };
	}>();

	export let display: ValueDisplay;
	export let sortedItems: TimelineItem[];
	export let scale: Scale;
	export let focalValue: number;
	export let width: number = 0;
	export let clientWidth: number = 0;
	export let clientHeight: number = 0;
	export let editable: boolean;
	export let onPreviewNewItemValue: (
		item: TimelineItem,
		value: number,
	) => number = (_, value) => value;
	export let oncontextmenu: (
		e: MouseEvent,
		item: TimelineItem,
	) => void = () => {};

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

	let focusCausedByClick = false;
	let mouseDownOn: TimelineItemElement | null = null;
	let dragPreview:
		| (OffsetBox & {
				backgroundColor?: string | CanvasGradient | CanvasPattern;
				item: TimelineItem;
				value: number;
		  })
		| null = null;
	$: dragPreview, (scrollNeeded = true);

	function clearSelection() {
		if (selection.selectedItems.size > 0) {
			selection.selectedItems.forEach(
				(it) => (
					(it.backgroundColor = undefined),
					(it.borderColor = undefined)
				),
			);
			redrawNeeded = true;
		}
		selection.selectedItems = new Set();
		selection.bounds = null;
		selection = selection;
	}
	function selectElement(element: TimelineItemElement) {
		if (selection.selectedItems.has(element)) return;
		clearSelection();
		selection.selectedItems = new Set([element]);
		redrawNeeded = true;
		selection = selection;
	}
	function selectElements(elements: TimelineItemElement[]) {
		clearSelection();
		selection.selectedItems = new Set(elements);
		if (selection.selectedItems.size > 1) {
			selection.bounds = selectionBounds(selection.selectedItems);
		}
		redrawNeeded = true;
		selection = selection;
	}
	function shouldExtendSelection(event: MouseEvent) {
		return (Platform.isMacOS && event.metaKey) || event.ctrlKey;
	}
	function includeElementInSelection(element: TimelineItemElement) {
		selection.selectedItems.add(element);
		if (selection.selectedItems.size > 1) {
			selection.bounds = selectionBounds(selection.selectedItems);
		}
		redrawNeeded = true;
		selection = selection;
	}
	function includeElementsInSelection(elements: TimelineItemElement[]) {
		for (const element of elements) {
			selection.selectedItems.add(element);
		}
		if (selection.selectedItems.size > 1) {
			selection.bounds = selectionBounds(selection.selectedItems);
		}
		selection = selection;
		redrawNeeded = true;
	}
	function createSelectionArea(
		x: number,
		y: number,
		width: number,
		height: number,
	) {
		selection.area = {
			offsetLeft: x,
			offsetTop: y,
			offsetWidth: width,
			offsetHeight: height,
		};
	}
	function selectionBounds(elements: Iterable<TimelineItemElement>) {
		let minX = Number.POSITIVE_INFINITY;
		let minY = Number.POSITIVE_INFINITY;
		let maxX = Number.NEGATIVE_INFINITY;
		let maxY = Number.NEGATIVE_INFINITY;
		for (const element of elements) {
			if (element.offsetLeft < minX) {
				minX = element.offsetLeft;
			}
			if (element.offsetTop < minY) {
				minY = element.offsetTop;
			}
			if (element.offsetRight > maxX) {
				maxX = element.offsetRight;
			}
			if (element.offsetBottom > maxY) {
				maxY = element.offsetBottom;
			}
		}

		return {
			offsetLeft: minX,
			offsetTop: minY,
			offsetWidth: maxX - minX,
			offsetHeight: maxY - minY,
		};
	}

	function handleMouseDown(event: MouseEvent) {
		focusCausedByClick = true;
		if (hover == null || hover.element == null) {
			focus = null;
			if (!shouldExtendSelection(event)) {
				clearSelection();
			}
			prepareMultiSelectDraw(event);
			return;
		}
		if (event.button === 2) {
			focusOn(hover.element, elements.indexOf(hover.element));
			return;
		}
		mouseDownOn = hover.element;
		if (!selection.selectedItems.has(mouseDownOn)) {
			if (shouldExtendSelection(event)) {
				includeElementInSelection(mouseDownOn);
			} else {
				selectElement(mouseDownOn);
			}
		}

		const startItem = mouseDownOn.layoutItem.item;
		const startItemBackground = mouseDownOn.backgroundColor;
		const startItemOffsetTop = mouseDownOn.offsetTop;

		const startViewportBounds = stageCSSTarget!.getBoundingClientRect();

		function dragItemListener(event: MouseEvent) {
			/** x position of the mouse relative to the document viewport */
			const mouseX = event.clientX;

			const valueAtLeftOfScreen =
				focalValue -
				scale.toValue(viewport.width / 2) -
				scale.toValue(stageCSSTarget!.getBoundingClientRect().left);

			const newItemValue = onPreviewNewItemValue(
				startItem,
				valueAtLeftOfScreen + scale.toValue(mouseX),
			);

			dragPreview = {
				offsetCenterX:
					scale.toPixels(newItemValue - focalValue) +
					viewport.width / 2,
				get offsetCenterY() {
					return this.offsetTop + item.height / 2;
				},
				get offsetLeft() {
					return this.offsetCenterX - item.width / 2;
				},
				offsetTop: startItemOffsetTop,
				get offsetRight() {
					return this.offsetCenterX + item.width / 2;
				},
				get offsetBottom() {
					return this.offsetTop + item.height;
				},
				get offsetWidth() {
					return item.width;
				},
				get offsetHeight() {
					return item.height;
				},
				get backgroundColor() {
					return startItemBackground;
				},
				item: startItem,
				value: newItemValue,
			};

			if (mouseX < startViewportBounds.left + viewport.padding.left) {
				const delta =
					mouseX - (startViewportBounds.left + viewport.padding.left);
				dispatch("scrollX", scale.toValue(delta));
			} else if (
				mouseX >
				startViewportBounds.right - viewport.padding.right
			) {
				const delta =
					mouseX -
					(startViewportBounds.right - viewport.padding.right);
				dispatch("scrollX", scale.toValue(delta));
			}
		}
		function releaseItemListener() {
			if (dragPreview != null) {
				dispatch(
					"moveItem",
					{ item: startItem, value: dragPreview.value },
					{ cancelable: true },
				);
			}
			dragPreview = null;
			window.removeEventListener("mousemove", dragItemListener);
			window.removeEventListener("mouseup", releaseItemListener);
		}
		if (editable) {
			window.addEventListener("mouseup", releaseItemListener);
			window.addEventListener("mousemove", dragItemListener);
		}
	}

	let selection: {
		area: null | {
			offsetLeft: number;
			offsetTop: number;
			offsetWidth: number;
			offsetHeight: number;
		};
		selectedItems: Set<TimelineItemElement>;
		bounds: null | {
			offsetLeft: number;
			offsetTop: number;
			offsetWidth: number;
			offsetHeight: number;
		};
	} = { area: null, bounds: null, selectedItems: new Set() };

	function prepareMultiSelectDraw(event: MouseEvent) {
		const startViewportBounds = stageCSSTarget!.getBoundingClientRect();
		const startX = event.clientX - startViewportBounds.left;
		const startY = event.clientY - startViewportBounds.top;
		const startFocalValue = focalValue;
		const startScrollTop = scrollTop;

		let isDragging = false;

		function dragSelectionArea(event: MouseEvent) {
			const scrolledStartX =
				startX - scale.toPixels(focalValue - startFocalValue);
			const scrolledStartY = startY - scrollTop - startScrollTop;
			const endX = event.clientX - startViewportBounds.left;
			const endY = event.clientY - startViewportBounds.top;

			const minX = Math.min(scrolledStartX, endX);
			const minY = Math.min(scrolledStartY, endY);
			const maxX = Math.max(scrolledStartX, endX);
			const maxY = Math.max(scrolledStartY, endY);

			const width = maxX - minX;
			const height = maxY - minY;

			if (!isDragging && width < 5 && height < 5) {
				return;
			}

			isDragging = true;

			const selectedItems: TimelineItemElement[] = [];
			// find all items in the selection area
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i];
				if (element.offsetLeft > maxX) {
					// no more of these ordered elements can intersect the
					// selection area
					break;
				}
				if (element.intersects(minX, minY, width, height)) {
					selectedItems.push(element);
				}
			}

			createSelectionArea(minX, minY, width, height);
			if (shouldExtendSelection(event)) {
				includeElementsInSelection(selectedItems);
			} else {
				selectElements(selectedItems);
			}

			if (
				event.clientX <
				startViewportBounds.left + viewport.padding.left
			) {
				const delta =
					event.clientX -
					(startViewportBounds.left + viewport.padding.left);
				dispatch("scrollX", scale.toValue(delta));
			} else if (
				event.clientX >
				startViewportBounds.right - viewport.padding.right
			) {
				const delta =
					event.clientX -
					(startViewportBounds.right - viewport.padding.right);
				dispatch("scrollX", scale.toValue(delta));
			}
			if (
				event.clientY <
				startViewportBounds.top + viewport.padding.top
			) {
				const delta =
					event.clientY -
					(startViewportBounds.top + viewport.padding.top);
				scrollTop += delta;
			} else if (event.clientY > startViewportBounds.bottom) {
				const delta =
					event.clientY -
					(startViewportBounds.bottom - viewport.padding.bottom);
				scrollTop += delta;
			}
		}
		function releaseSelectionArea() {
			selection.area = null;
			selection = selection;
			window.removeEventListener("mousemove", dragSelectionArea);
			window.removeEventListener("mouseup", releaseSelectionArea);
		}
		window.addEventListener("mouseup", releaseSelectionArea);
		window.addEventListener("mousemove", dragSelectionArea);
	}

	function handleMouseUp(event: MouseEvent) {
		if (event.button === 2) {
			if (hover == null || hover.element == null) {
				return;
			}
			oncontextmenu(event, hover.element.layoutItem.item);
			return;
		}
		if (mouseDownOn == null) {
			return;
		}
		const mouseWasDownOn = mouseDownOn;
		mouseDownOn = null;
		if (hover == null || hover.element == null) {
			return;
		}
		if (hover.element !== mouseWasDownOn) {
			return;
		}

		focus = null;
		const hoveredItem = hover.element.layoutItem.item;
		hover = null;

		if (!shouldExtendSelection(event)) {
			dispatch("select", {
				item: hoveredItem,
				causedBy: event,
			});
		}
	}

	function handleDblClick(event: MouseEvent) {
		if (!editable) {
			return;
		}
		if (hover != null) {
			return;
		}

		const leftValue = focalValue - scale.toValue(viewport.width / 2);
		const valueFromLeft = scale.toValue(event.offsetX);
		const value = leftValue + valueFromLeft;

		dispatch("create", { value });
	}

	let elements: TimelineItemElement[] = [];
	let hover: {
		element: TimelineItemElement;
		pos: [number, number];
	} | null = null;
	let focus: {
		element: TimelineItemElement;
		index: number;
	} | null = null;
	function verticalScrollToFocusItem(element: TimelineItemElement) {
		if (element.offsetTop < 0) {
			scrollTop = element.layoutItem.top();
			scrollNeeded = true;
		} else if (element.offsetBottom > viewport.height) {
			scrollTop = element.layoutItem.bottom() - viewport.height;
			scrollNeeded = true;
		}
	}
	function focusOn(
		element: TimelineItemElement,
		index: number,
		skipEvent: boolean = false,
	) {
		if (!skipEvent) {
			dispatch("focus", element.layoutItem.item);
		}
		focus = {
			element,
			index,
		};
		redrawNeeded = true;

		verticalScrollToFocusItem(element);

		if (focus.element.offsetLeft < 0) {
			dispatch("scrollToValue", focus.element.layoutItem.item.value());
		} else if (focus.element.offsetRight > viewport.width) {
			dispatch("scrollToValue", focus.element.layoutItem.item.value());
		}
	}
	function focusNextItem(back: boolean = false) {
		const index =
			focus == null ? 0 : back ? focus.index - 1 : focus.index + 1;
		if (index < elements.length && index >= 0) {
			focusOn(elements[index], index);
			return true;
		} else {
			focus = null;
			return false;
		}
	}
	export function focusOnItem(item: TimelineItem) {
		const index = elements.findIndex(
			(element) => element.layoutItem.item === item,
		);
		if (index >= 0) {
			focusOn(elements[index], index, true);
		}
	}

	function handleMouseMove(event: MouseEvent) {
		detectHover(event);
	}

	let scrollbarDragging = false;
	function detectHover(event: { offsetX: number; offsetY: number }) {
		if (
			!scrollbarDragging &&
			dragPreview == null &&
			selection.area == null
		) {
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
		if (focus) {
			const index = points.findIndex(
				(item) => item === focus!.element.layoutItem.item,
			);
			if (index >= 0) {
				focus = {
					index,
					element: elements[index],
				};
			} else {
				focus = null;
			}
		}
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
	$: clientWidth = viewport.width - scrollbarWidth;
	let scrollbarMeasurerFullHeight: number = 0;
	let scrollbarMeasurerInnerHeight: number = 0;
	$: scrollbarHeight =
		scrollbarMeasurerFullHeight - scrollbarMeasurerInnerHeight;
	$: clientHeight = viewport.height - scrollbarHeight;

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
		const selectedPointStyle = getComputedStyle(pointElements[1]!);

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
				if (focus != null) {
					if (focus.index > layout.length) {
						focus = null;
					}
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
				if (focus) {
					focus.element = elements[focus.index];
					if (!focus.element) {
						focus = null;
					} else {
						if (layoutNeeded) {
							verticalScrollToFocusItem(focus.element);
						}
						focus = focus;
					}
				}
				selection.bounds = selectionBounds(selection.selectedItems);
				selection = selection;
			}

			if (redrawNeeded || scrollNeeded || layoutNeeded) {
				let dragPreviewed = dragPreview != null;
				const hasSelectedItems = selection.selectedItems.size > 0;

				if (hasSelectedItems || dragPreviewed) {
					const backgroundColor = dragPreviewed
						? getComputedStyle(stageCSSTarget!).backgroundColor
						: null;

					for (let i = 0; i < elements.length; i++) {
						const element = elements[i];
						if (
							hasSelectedItems &&
							selection.selectedItems.has(element)
						) {
							element.backgroundColor =
								selectedPointStyle.backgroundColor;
							element.borderColor =
								selectedPointStyle.borderColor;
						}

						if (
							dragPreviewed &&
							dragPreview!.item === element.layoutItem.item
						) {
							element.backgroundColor = backgroundColor!;
							dragPreviewed = false;
						}
					}
				}

				renderContext.fillStyle = pointStyle!.backgroundColor;
				renderLayout(
					renderContext,
					viewport,
					item,
					elements,
					dragPreview,
				);
			}
			layoutNeeded = false;
			scrollNeeded = false;
			redrawNeeded = false;

			requestAnimationFrame(() => draw(layout));
		}

		requestAnimationFrame(() => draw());
	});
</script>

<div id="stage" bind:this={stageCSSTarget} class:has-hover={hover != null}>
	<div style="display: flex;flex-direction: row;">
		<div class="timeline-item" bind:this={pointElements[0]}></div>
		<div class="timeline-item selected" bind:this={pointElements[1]}></div>
	</div>
	<div class="timeline-item focused" bind:this={pointElements[2]}></div>
	<div
		class="bottom-right-padding-measure"
		bind:offsetWidth={innerWidth}
		bind:offsetHeight={innerHeight}
	></div>
	{#if selection.area != null}
		<div
			class="selection-area"
			style:position="absolute"
			style:left={selection.area.offsetLeft + "px"}
			style:top={selection.area.offsetTop + "px"}
			style:width={selection.area.offsetWidth + "px"}
			style:height={selection.area.offsetHeight + "px"}
		/>
	{/if}
	{#if selection.bounds != null}
		{@const _ = console.log(selection.bounds)}
		<div
			class="selection-area selected"
			style="position: absolute; left:{selection.bounds
				.offsetLeft}px; top:{selection.bounds
				.offsetTop}px; width:{selection.bounds
				.offsetWidth}px; height:{selection.bounds.offsetHeight}px;"
		/>
	{/if}
	<canvas
		bind:this={canvas}
		tabindex={0}
		on:wheel|stopPropagation|capture={handleScroll}
		on:mouseleave={() => (hover = null)}
		on:mousemove={handleMouseMove}
		on:mousedown={handleMouseDown}
		on:mouseup={handleMouseUp}
		on:dblclick={handleDblClick}
		on:focus={(e) => {
			if (!focusCausedByClick && focusNextItem()) {
				e.stopPropagation();
				e.preventDefault();
			}
			focusCausedByClick = false;
		}}
		on:keydown={(event) => {
			switch (event.key) {
				case "ArrowLeft":
					dispatch("scrollX", scale.toValue(-10));
					break;
				case "ArrowRight":
					dispatch("scrollX", scale.toValue(10));
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
				case "Tab":
					if (focusNextItem(event.shiftKey)) {
						event.stopPropagation();
						event.preventDefault();
					}
					break;
			}
		}}
	/>
	{#if hover != null && display != null}
		<Hover
			{display}
			position={hover.element}
			name={hover.element.layoutItem.item.name()}
			value={hover.element.layoutItem.item.value()}
		/>
	{/if}
	{#if dragPreview != null && display != null}
		<Hover
			{display}
			position={dragPreview}
			name={dragPreview.item.name()}
			value={dragPreview.value}
		/>
	{/if}
	{#if focus != null}
		<FocusedItem focus={focus.element} />
	{/if}
	<Scrollbar
		style={`height: ${scrollbarHeight}px;`}
		orientation={"horizontal"}
		controls={"stage"}
		tabindex={sortedItems.length}
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
		tabindex={sortedItems.length + 1}
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
	@property --timeline-item-color {
		syntax: "<color>";
		initial-value: grey;
		inherits: true;
	}
	@property --timeline-item-size {
		syntax: "<length>";
		initial-value: 16px;
		inherits: true;
	}
	@property --timeline-item-margin {
		syntax: "<length>";
		initial-value: 4px;
		inherits: true;
	}

	:global(.timeline-item) {
		background-color: var(--timeline-item-color);
		margin: var(--timeline-item-margin, 4px);
	}

	:global(#stage .selection-area) {
		background-color: var(--timeline-selection-area-background);
		border: 2px solid var(--timeline-selection-area-border);
	}
	:global(#stage .selection-area.selected) {
		opacity: 0.5;
	}

	:global(.timeline-item.selected) {
		background-color: var(--timeline-background);
		border-color: var(--timeline-item-border-hover);
	}

	div#stage {
		--timeline-item-diameter: var(--timeline-item-size);
		--timeline-item-radius: calc(var(--timeline-item-diameter) / 2);

		flex-grow: 1;
		position: relative;
		padding: var(--timeline-padding);
		overflow: hidden;
		--scrollbar-width: var(--size-4-1);
	}
	div#stage.has-hover {
		cursor: pointer;
	}

	canvas {
		position: absolute;
		top: 0;
		left: 0;
	}
	div#stage .timeline-item {
		visibility: hidden !important;
		width: var(--timeline-item-diameter);
		height: var(--timeline-item-diameter);
	}
	div#stage .bottom-right-padding-measure {
		width: 1005;
		height: 100%;
		visibility: hidden !important;
		pointer-events: none;
		bottom: 0;
		right: 0;
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

	div#stage :global([role="scrollbar"]) {
		position: absolute;
	}
	div#stage :global([role="scrollbar"][aria-orientation="horizontal"]) {
		bottom: 0;
		left: 0;
		width: 100%;
	}
	div#stage :global([role="scrollbar"][aria-orientation="vertical"]) {
		top: 0;
		right: 0;
		height: 100%;
	}
</style>
