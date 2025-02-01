<script lang="ts">
	import { run } from "svelte/legacy";

	import { createEventDispatcher, onMount } from "svelte";
	import { layoutPoints } from "./CanvasStage";
	import { renderLayout } from "./draw";
	import type { TimelineItem } from "../../Timeline";
	import {
		TimelineItemElement,
		TimelineItemElementStyle,
	} from "src/timeline/layout/stage/TimelineItemElement";
	import { type Scale } from "src/timeline/scale";
	import Scrollbar from "src/view/controls/Scrollbar.svelte";
	import type { ChangeEvent } from "src/view/controls/Scrollbar";
	import Hover, { ValueFormatter } from "./Hover.svelte";
	import FocusedItem from "./FocusedItem.svelte";
	import { Platform } from "obsidian";
	import SelectionArea from "./CanvasSelectionArea.svelte";
	import SelectedBounds from "./SelectedBounds.svelte";
	import DraggedItem from "./DraggedItem.svelte";
	import type { SortedArray } from "src/utils/collections";
	import Background from "src/timeline/layout/stage/Background.svelte";
	import type { LayoutItem } from "src/timeline/layout/stage/layout";
	import { DragPreviewElement } from "src/timeline/layout/stage/drag.svelte";

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
		moveItems: { item: TimelineItem; value: number; endValue: number }[];
	}>();

	interface Props {
		formatter: ValueFormatter;
		sortedItems: SortedArray<TimelineItem>;
		scale: Scale;
		focalValue: number;
		width?: number;
		clientWidth?: number;
		clientHeight?: number;
		editable: boolean;
		onPreviewNewItemValue?: (item: TimelineItem, value: number) => number;
		oncontextmenu?: (e: MouseEvent, items: TimelineItem[]) => void;
	}

	let {
		formatter,
		sortedItems,
		scale,
		focalValue,
		width = $bindable(0),
		clientWidth = $bindable(0),
		clientHeight = $bindable(0),
		editable,
		onPreviewNewItemValue = (_, value) => value,
		oncontextmenu = () => {},
	}: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	const pointElements: {
		base: HTMLDivElement | undefined;
		nextCol: HTMLDivElement | undefined;
		selected: HTMLDivElement | undefined;
		focused: HTMLDivElement | undefined;
		nextRow: HTMLDivElement | undefined;
	} = $state({
		base: undefined,
		nextCol: undefined,
		selected: undefined,
		focused: undefined,
		nextRow: undefined,
	});
	let stageCSSTarget: HTMLDivElement | undefined = $state();

	let innerWidth = $state(0);
	let innerHeight = $state(0);
	const viewport = $state({
		width: 0,
		height: 0,
		padding: {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		},
	});

	let itemVSpacing = 0;
	let itemRowCenterOffset = 0;
	const item = $state({
		width: 0,
		height: 0,
		margin: {
			horizontal: 0,
			vertical: 0,
		},
	});

	let layoutNeeded = true;
	let scrollNeeded = true;
	let redrawNeeded = true;

	const resizeObserver = new ResizeObserver((a) => {
		if (
			canvas == null ||
			Object.values(pointElements).some((el) => el == null) ||
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

		item.width = Math.round(pointElements.base!.clientWidth);
		item.height = Math.round(pointElements.base!.clientHeight);
		item.margin.horizontal = Math.round(
			Math.max(
				0,
				pointElements.nextCol!.offsetLeft -
					(pointElements.base!.offsetLeft + item.width),
			),
		);
		item.margin.vertical = Math.round(
			Math.max(
				0,
				pointElements.nextRow!.offsetTop -
					(pointElements.base!.offsetTop + item.height),
			),
		);
		itemVSpacing = item.height + item.margin.vertical;

		(viewport.padding.top = Math.max(
			0,
			pointElements.base!.offsetTop - item.margin.vertical,
		)),
			(viewport.padding.left = Math.max(
				0,
				pointElements.base!.offsetLeft - item.margin.horizontal,
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
		itemRowCenterOffset =
			viewport.padding.top + item.height / 2 + item.margin.vertical / 2;

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
			const mouseOffsetX =
				event.clientX - stageCSSTarget!.getBoundingClientRect().left;
			const xRelativeToMiddle = mouseOffsetX - viewport.width / 2;
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
			const newScroll = Math.max(0, scrollTop + event.deltaY / 16);
			if (scrollTop != newScroll) {
				scrollTop = newScroll;
				scrollNeeded = true;
			}
		}
	}

	let focusCausedByClick = $state(false);
	let mouseDownOn: TimelineItemElement | null = null;

	class DragPreview {
		private items: Set<TimelineItem> = new Set();
		private elements: Array<DragPreviewElement> = [];

		constructor() {}

		arr(): readonly DragPreviewElement[] {
			return this.elements;
		}

		add(element: DragPreviewElement) {
			this.elements.push(element);
			this.items.add(element.item);
		}

		[Symbol.iterator]() {
			return this.elements[Symbol.iterator]();
		}

		movedItems() {
			return this.elements.map((element, index) => {
				return element;
			});
		}

		has(item: TimelineItem) {
			return this.items.has(item);
		}

		getCount() {
			return this.items.size;
		}

		at(index: number) {
			return this.elements[index];
		}
	}

	let dragPreview: DragPreview | null = $state(null);
	function onDragPreviewChanged(_: DragPreview | null) {
		scrollNeeded = true;
	}
	$effect(() => {
		// when dragPreview changes, we need to force a redraw
		onDragPreviewChanged(dragPreview);
	});

	function clearSelection() {
		if (selection.selectedItems.size > 0) {
			redrawNeeded = true;
		}
		selection.selectedItems = new Map();
		selection.bounds = null;
		selection = selection;
	}
	function selectElement(element: TimelineItemElement) {
		if (selection.selectedItems.has(element.layoutItem.item.id())) return;
		clearSelection();
		selection.selectedItems = new Map([
			[element.layoutItem.item.id(), element],
		]);
		redrawNeeded = true;
		selection = selection;
	}
	function selectElements(elements: TimelineItemElement[]) {
		clearSelection();
		selection.selectedItems = new Map(
			elements.map((it) => [it.layoutItem.item.id(), it]),
		);
		if (selection.selectedItems.size > 1) {
			selection.bounds = selectionBounds(
				selection.selectedItems.values(),
			);
		}
		redrawNeeded = true;
		selection = selection;
	}
	function shouldExtendSelection(event: MouseEvent) {
		return (Platform.isMacOS && event.metaKey) || event.ctrlKey;
	}
	function includeElementInSelection(element: TimelineItemElement) {
		selection.selectedItems.set(element.layoutItem.item.id(), element);
		if (selection.selectedItems.size > 1) {
			selection.bounds = selectionBounds(
				selection.selectedItems.values(),
			);
		}
		redrawNeeded = true;
		selection = selection;
	}
	function includeElementsInSelection(elements: TimelineItemElement[]) {
		for (const element of elements) {
			selection.selectedItems.set(element.layoutItem.item.id(), element);
		}
		if (selection.selectedItems.size > 1) {
			selection.bounds = selectionBounds(
				selection.selectedItems.values(),
			);
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
			focusOn(hover.element, elements.arr.indexOf(hover.element));
			return;
		}
		mouseDownOn = hover.element;
		if (!selection.selectedItems.has(mouseDownOn.layoutItem.item.id())) {
			if (shouldExtendSelection(event)) {
				includeElementInSelection(mouseDownOn);
			} else {
				selectElement(mouseDownOn);
			}
		}

		prepareDragSelection(event);
	}

	function prepareDragSelection(event: MouseEvent) {
		const selectedItems = Array.from(selection.selectedItems.values());
		if (selectedItems.length === 0) {
			return;
		}

		const startItemBackground = selectedItems[0].backgroundColor;
		const startItemBorder = selectedItems[0].borderColor;
		const startItemBorderWidth = selectedItems[0].strokeWidth;
		const startViewportBounds = stageCSSTarget!.getBoundingClientRect();

		const startMouseValue =
			focalValue -
			scale.toValue(viewport.width / 2) -
			scale.toValue(stageCSSTarget!.getBoundingClientRect().left) +
			scale.toValue(event.clientX);

		function dragItemListener(event: MouseEvent) {
			/** x position of the mouse relative to the document viewport */
			const mouseX = event.clientX;

			const mouseValue =
				focalValue -
				scale.toValue(viewport.width / 2) -
				scale.toValue(stageCSSTarget!.getBoundingClientRect().left) +
				scale.toValue(event.clientX);

			const deltaValue = mouseValue - startMouseValue;

			dragPreview = dragPreview ?? new DragPreview();
			for (let i = 0; i < selectedItems.length; i++) {
				const item = selectedItems[i];
				const newItemValue = onPreviewNewItemValue(
					selectedItems[i].layoutItem.item,
					selectedItems[i].layoutItem.item.value() + deltaValue,
				);
				const newEndValue = onPreviewNewItemValue(
					selectedItems[i].layoutItem.item,
					newItemValue + selectedItems[i].layoutItem.item.length(),
				);
				const offsetCenterX =
					scale.toPixels(newItemValue - focalValue) +
					viewport.width / 2;

				if (dragPreview.at(i) != null) {
					const previousPreview = dragPreview.at(i);
					previousPreview.value = newItemValue;
					previousPreview.endValue = newEndValue;
					previousPreview.length = newEndValue - newItemValue;
					previousPreview.offsetCenterX = offsetCenterX;
				} else {
					dragPreview.add(
						new DragPreviewElement(
							item,
							newItemValue,
							newEndValue - newItemValue,
							newEndValue,
							offsetCenterX,
							startItemBackground,
							startItemBorder,
							startItemBorderWidth,
						),
					);
				}
			}
			dragPreview = dragPreview;
			scrollNeeded = true;

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
				dispatch("moveItems", dragPreview.movedItems(), {
					cancelable: true,
				});
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
		selectedItems: Map<string, TimelineItemElement>;
		bounds: null | {
			offsetLeft: number;
			offsetTop: number;
			offsetWidth: number;
			offsetHeight: number;
		};
	} = $state({ area: null, bounds: null, selectedItems: new Map() });

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
			for (let i = 0; i < elements.arr.length; i++) {
				const element = elements.arr[i];
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
			oncontextmenu(event, [hover.element.layoutItem.item]);
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

	let elements = {
		arr: [] as TimelineItemElement[],
		getCount() {
			return this.arr.length;
		},
		[Symbol.iterator]() {
			return this.arr[Symbol.iterator]();
		},
	};
	let hover: {
		element: TimelineItemElement;
		pos: [number, number];
	} | null = $state(null);
	let focus: {
		element: TimelineItemElement;
		index: number;
	} | null = $state(null);
	function verticalScrollToFocusItem(element: TimelineItemElement) {
		if (element.offsetTop < 0) {
			scrollTop = element.layoutItem.top;
			scrollNeeded = true;
		} else if (element.offsetBottom > viewport.height) {
			scrollTop = element.layoutItem.bottom - viewport.height;
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
		if (index < elements.arr.length && index >= 0) {
			focusOn(elements.arr[index], index);
			return true;
		} else {
			focus = null;
			return false;
		}
	}
	export function focusOnItem(item: TimelineItem) {
		const index = elements.arr.findIndex(
			(element) => element.layoutItem.item === item,
		);
		if (index >= 0) {
			focusOn(elements.arr[index], index, true);
		}
	}

	function handleMouseMove(event: MouseEvent) {
		detectHover(event);
	}

	let scrollbarDragging = $state(false);
	function detectHover(event: { offsetX: number; offsetY: number }) {
		if (
			!scrollbarDragging &&
			dragPreview == null &&
			selection.area == null
		) {
			for (let i = 0; i < elements.arr.length; i++) {
				const element = elements.arr[i];
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

	function onPointsOrScaleChanged(
		points: SortedArray<TimelineItem>,
		scale: Scale,
	) {
		if (focus) {
			const index = points.items.findIndex(
				(item) => item === focus!.element.layoutItem.item,
			);
			if (index >= 0) {
				focus = {
					index,
					element: elements.arr[index],
				};
			} else {
				focus = null;
			}
		}
		layoutNeeded = true;
	}
	run(() => {
		onPointsOrScaleChanged(sortedItems, scale);
	});

	function onFocalValueChanged(_: number) {
		scrollNeeded = true;
	}
	run(() => {
		onFocalValueChanged(focalValue);
	});

	export function invalidateColors() {
		redrawNeeded = true;
	}

	let scrollTop = $state(0);
	function onScrollTopChanged(_: number) {
		scrollNeeded = true;
	}
	run(() => {
		onScrollTopChanged(scrollTop);
	});

	let scrollHeight = $state(0);
	let visibleVAmount = $state(0);

	let scrollbarMeasurerFullWidth: number = $state(0);
	let scrollbarMeasurerInnerWidth: number = $state(0);
	let scrollbarWidth = $derived(
		scrollbarMeasurerFullWidth - scrollbarMeasurerInnerWidth,
	);
	run(() => {
		clientWidth = viewport.width - scrollbarWidth;
	});
	let scrollbarMeasurerFullHeight: number = $state(0);
	let scrollbarMeasurerInnerHeight: number = $state(0);
	let scrollbarHeight = $derived(
		scrollbarMeasurerFullHeight - scrollbarMeasurerInnerHeight,
	);
	run(() => {
		clientHeight = viewport.height - scrollbarHeight;
	});

	let hScrollValue = $state(0);
	let visibleHAmount = $state(viewport.width);
	let minHScrollValue = $state(0);
	let maxHScrollValue = $state(0);

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
			Object.values(pointElements).some((el) => el == null) ||
			stageCSSTarget == null
		) {
			return;
		}

		resizeObserver.observe(canvas);
		Object.values(pointElements).forEach((element) =>
			resizeObserver.observe(element!),
		);
		resizeObserver.observe(stageCSSTarget);

		function draw(
			layout: LayoutItem[] = [],
			pointStyle?: TimelineItemElementStyle,
		) {
			if (canvas == null) return;
			const renderContext = canvas.getContext("2d");
			if (renderContext == null) return;

			if (layoutNeeded) {
				layout = layoutPoints(
					viewport,
					item,
					scale,
					sortedItems.items,
					layout,
				);

				if (layout.length > 0) {
					scrollHeight = 0;
					for (const bounds of layout) {
						scrollHeight = Math.max(
							scrollHeight,
							bounds.bottom +
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
				if (elements.arr.length > layout.length) {
					elements.arr = elements.arr.slice(0, layout.length);
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
						elements.arr[i] ?? new TimelineItemElement(item);
					element.layoutItem = item;
					element.offsetCenterX = item.valueX - scrollLeft;
					element.offsetCenterY = item.centerY - scrollTop;
					element.offsetLeft = element.offsetCenterX - item.radius;
					element.offsetTop = element.offsetCenterY - item.radius;
					element.offsetWidth = item.width;
					element.offsetHeight = item.height;
					element.offsetRight =
						element.offsetLeft + element.offsetWidth;
					element.offsetBottom =
						element.offsetTop + element.offsetHeight;

					if (selection.selectedItems.has(item.item.id())) {
						selection.selectedItems.set(item.item.id(), element);
					}
					elements.arr[i] = element;
				}

				selection.bounds = selectionBounds(
					selection.selectedItems.values(),
				);

				visibleHAmount = scale.toValue(viewport.width);
				hScrollValue = focalValue - scale.toValue(viewport.width / 2);

				const leftMostValue =
					(sortedItems.items[0]?.value() ?? 0) -
					scale.toValue(viewport.padding.left + item.width / 2);

				const rightMostValue =
					(sortedItems.items[sortedItems.length - 1]?.value() ?? 0) -
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
					focus.element = elements.arr[focus.index];
					if (!focus.element) {
						focus = null;
					} else {
						if (layoutNeeded) {
							verticalScrollToFocusItem(focus.element);
						}
						focus = focus;
					}
				}
				selection.bounds = selectionBounds(
					selection.selectedItems.values(),
				);
				selection = selection;
			}

			const currentPointStyle = new TimelineItemElementStyle(
				getComputedStyle(pointElements.base!),
			);
			if (
				redrawNeeded ||
				scrollNeeded ||
				layoutNeeded ||
				!currentPointStyle.equals(pointStyle)
			) {
				let dragPreviewed = dragPreview != null;
				const hasSelectedItems = selection.selectedItems.size > 0;

				elements.arr.forEach((el) => (el.style = currentPointStyle));

				if (hasSelectedItems || dragPreviewed) {
					const selectedStyle = new TimelineItemElementStyle(
						getComputedStyle(pointElements.selected!),
					);

					for (let i = 0; i < elements.arr.length; i++) {
						const element = elements.arr[i];
						if (
							dragPreviewed &&
							dragPreview!.has(element.layoutItem.item)
						) {
							element.visible = false;
							continue;
						}

						if (
							hasSelectedItems &&
							selection.selectedItems.has(
								element.layoutItem.item.id(),
							)
						) {
							element.style = selectedStyle;
						}
					}
				}

				const ratio = activeWindow.devicePixelRatio || 1;
				if (
					canvas.width != viewport.width * ratio ||
					canvas.height != viewport.height * ratio
				) {
					canvas.width = viewport.width * ratio;
					canvas.height = viewport.height * ratio;
					canvas.style.width = viewport.width + "px";
					canvas.style.height = viewport.height + "px";
					renderContext.scale(ratio, ratio);
				}

				renderLayout(
					renderContext,
					viewport,
					elements.arr,
					dragPreview?.arr() ?? null,
				);
			}
			layoutNeeded = false;
			scrollNeeded = false;
			redrawNeeded = false;

			requestAnimationFrame(() => draw(layout, currentPointStyle));
		}

		requestAnimationFrame(() => draw());
	});
</script>

<div
	id="stage"
	bind:this={stageCSSTarget}
	class:has-hover={hover != null}
	class:editable
>
	<Background {scrollTop} itemDimensions={item} {viewport} />
	<div style="display: flex;flex-direction: row;">
		<div class="timeline-item" bind:this={pointElements.base}></div>
		<div class="timeline-item" bind:this={pointElements.nextCol}></div>
		<div
			class="timeline-item selected"
			bind:this={pointElements.selected}
		></div>
		<div
			class="timeline-item focused"
			bind:this={pointElements.focused}
		></div>
	</div>
	<div class="timeline-item" bind:this={pointElements.nextRow}></div>
	<div
		class="bottom-right-padding-measure"
		bind:offsetWidth={innerWidth}
		bind:offsetHeight={innerHeight}
	></div>
	<SelectionArea area={selection?.area} />
	<canvas
		bind:this={canvas}
		tabindex={0}
		onwheelcapture={(e) => {
			e.stopPropagation();
			handleScroll(e);
		}}
		onmouseleave={() => (hover = null)}
		onmousemove={handleMouseMove}
		onmousedown={handleMouseDown}
		onmouseup={handleMouseUp}
		ondblclick={handleDblClick}
		onfocus={(e) => {
			if (!focusCausedByClick && focusNextItem()) {
				e.stopPropagation();
				e.preventDefault();
			}
			focusCausedByClick = false;
		}}
		onkeydown={(event) => {
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
	></canvas>
	<SelectedBounds
		dragging={dragPreview != null}
		bounds={selection.bounds}
		selectedItemCount={selection.selectedItems.size ?? 0}
		onmousedown={prepareDragSelection}
		onmouseup={(e) => {
			if (e.button === 2) {
				oncontextmenu(
					e,
					Array.from(selection.selectedItems.values()).map(
						(it) => it.layoutItem.item,
					),
				);
			}
		}}
		onwheel={handleScroll}
	/>
	{#if hover != null && formatter != null}
		<Hover
			{formatter}
			position={hover.element}
			name={hover.element.layoutItem.item.name()}
			value={hover.element.layoutItem.item.value()}
			length={hover.element.layoutItem.item.length()}
		/>
	{/if}
	{#if dragPreview != null && formatter != null && dragPreview.getCount() === 1}
		<DraggedItem
			{formatter}
			position={dragPreview.at(0)}
			name={dragPreview.at(0).item.name()}
			value={dragPreview.at(0).value}
			length={dragPreview.at(0).length}
			endValue={dragPreview.at(0).endValue}
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

	:global(.timeline-item.selected) {
		background-color: var(--timeline-background);
		border-color: var(--timeline-item-border-hover);
		border-width: 1px;
		border-style: solid;
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
