<script
	lang="ts"
	generics="T extends TimelineItemSource, SourceItem extends PlotAreaSourceItem<T>"
>
	import { createEventDispatcher, untrack } from "svelte";
	import { renderLayout } from "./draw";
	import {
		boxContainsPoint,
		type OffsetBox,
	} from "src/timeline/layout/stage/TimelineItemElement";
	import { type Scale } from "src/timeline/scale";
	import Scrollbar from "src/view/controls/Scrollbar.svelte";
	import type { ChangeEvent } from "src/view/controls/Scrollbar";
	import Hover from "./Hover.svelte";
	import FocusedItem from "./FocusedItem.svelte";
	import { Platform } from "obsidian";
	import SelectionArea from "./CanvasSelectionArea.svelte";
	import SelectedBounds from "./SelectedBounds.svelte";
	import DraggedItem from "./DraggedItem.svelte";
	import { DragPreviewElement } from "src/timeline/layout/stage/drag.svelte";
	import { on } from "svelte/events";
	import { layoutItems } from "src/timeline/layout/stage/layout";
	import {
		PlotAreaItem,
		type PlotAreaSourceItem,
	} from "src/timeline/layout/stage/item";
	import type { TimelineItemSource } from "src/timeline/item/TimelineItem.svelte";
	import { Selection } from "src/timeline/layout/stage/selection.svelte";
	import CssProp from "src/view/CSSProp.svelte";
	import CssColorProp from "src/view/CSSColorProp.svelte";
	import Background from "src/timeline/layout/stage/Background.svelte";
	import Padding from "src/timeline/layout/stage/Padding.svelte";
	import type { FitBounds } from "src/timeline/controls/navigation/zoomToFit";
	import { parse } from "path";
	import { blendColors, OverlayColor, parseColor } from "src/color";

	type Item = PlotAreaItem<T, SourceItem>;

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
		select: { item: SourceItem; causedBy: Event };
		focus: SourceItem;
		create: { value: number };
	}>();

	interface Props {
		sortedItems: readonly SourceItem[];
		scale: Scale;
		focalValue: number;
		// todo: replace flags with object of methods. ie: null | { onMove?(): void; onResize?(): void }
		editable: boolean;
		itemsResizable: boolean;
		summarizeItem: (item: SourceItem) => string;
		previewItem: (
			item: SourceItem,
			name: string,
			value: number,
			length: number,
			endValue: number,
		) => string;
		onPreviewNewItemValue?: (item: SourceItem, value: number) => number;
		oncontextmenu?: (e: MouseEvent, items: SourceItem[]) => void;
		onItemsChanged?(
			items: {
				item: SourceItem;
				value: number;
				length: number;
				endValue: number;
			}[],
		): Promise<void>;
	}

	let {
		sortedItems: timelineItems,
		scale,
		focalValue,
		editable,
		itemsResizable,
		summarizeItem,
		previewItem,
		onPreviewNewItemValue = (_, value) => value,
		oncontextmenu = () => {},
		onItemsChanged = async () => {},
	}: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	let stageCSSTarget: HTMLDivElement | undefined = $state();

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

	const itemStyle = $state({
		size: 16,
		radius: 8,

		color: "darkgray",

		selected: {
			borderWidth: 2,
			color: "black",
			borderColor: "black",
		},

		margin: {
			horizontal: 0,
			vertical: 0,

			top: 2,
			right: 2,
			bottom: 2,
			left: 2,
		},
	});
	const selectedColorOverlay = $derived(
		new OverlayColor(itemStyle.selected.color),
	);

	export function fitBounds(): FitBounds {
		return {
			size: viewport.width,
			padding: {
				start: viewport.padding.left,
				end: viewport.padding.right,
			},
			items: {
				size: itemStyle.size,
				margin: {
					start: itemStyle.margin.left,
					end: itemStyle.margin.right,
				},
			},
		};
	}

	const items = $derived.by(() => {
		const plotAreaItems = timelineItems.map(PlotAreaItem.from);
		return plotAreaItems as Item[];
	});
	const scaled = $derived.by(() => {
		const currentScale = scale;
		items.forEach((it) => it.scale(currentScale));
		return {
			items,
			_: Math.random(),
		};
	});
	$effect(() => {
		const currentFocus = focus;
		if (currentFocus != null && currentFocus.index > items.length) {
			focus = null;
		}
	});

	const layout = $derived.by(() => {
		const plotAreaItems = scaled.items;
		layoutItems(itemStyle.size, itemStyle.margin, plotAreaItems);
		return {
			items: plotAreaItems,
			_: Math.random(),
		};
	});
	const scrollHeight = $derived.by(() => {
		const padding = viewport.padding;
		let max = padding.top;
		const layoutPadding = padding.top + padding.bottom;
		layout.items.forEach(
			(it) => (max = Math.max(max, it.layoutBottom + layoutPadding)),
		);
		return max;
	});
	const maxScrollTop = $derived(Math.max(0, scrollHeight - viewport.height));
	let scrollTop = $state(0);
	function scrollVertically(value: number) {
		scrollTop = Math.max(
			0,
			Math.min(
				untrack(() => maxScrollTop),
				value,
			),
		);
	}
	$effect(() => {
		if (untrack(() => scrollTop) > maxScrollTop) {
			scrollVertically(maxScrollTop);
		}
	});
	const scrollLeft = $derived(
		scale.toPixels(focalValue) - viewport.width / 2,
	);
	const scrolled = $derived.by(() => {
		const layoutItems = layout.items;
		const top = scrollTop - viewport.padding.top;
		const left = scrollLeft;
		layoutItems.forEach((it) => it.scroll(top, left));
		return {
			items: layoutItems,
			_: Math.random(),
		};
	});

	const styled = $derived.by(() => {
		const currentItems = items;
		const itemColor = itemStyle.color;

		if (selection.isEmpty()) {
			currentItems.forEach((it) => {
				const prefColor = it.color();
				it.backgroundColor = prefColor ?? itemColor;
				it.borderColor = prefColor ?? itemColor;
				it.strokeWidth = 0;
			});
			return { items: currentItems, _: Math.random() };
		}

		const selectedItemColor = selectedColorOverlay;
		const selectedItemBorder = {
			color: itemStyle.selected.borderColor,
			width: itemStyle.selected.borderWidth,
		};

		currentItems.forEach((it) => {
			const prefColor = it.color();
			if (selection.has(it)) {
				it.backgroundColor = selectedItemColor.blend(
					prefColor ?? itemColor,
				);
				it.borderColor = selectedItemBorder.color;
				it.strokeWidth = selectedItemBorder.width;
			} else {
				it.backgroundColor = prefColor ?? itemColor;
				it.borderColor = prefColor ?? itemColor;
				it.strokeWidth = 0;
			}
		});
		return { items: currentItems, _: Math.random() };
	});

	$effect(() => {
		const currentCanvas = canvas;
		if (currentCanvas === undefined) return;

		const viewportWidth = viewport.width;
		const viewportHeight = viewport.height;

		const scrolledItems = scrolled.items;
		// re-style should trigger a redraw
		styled.items;
		const previewItems = dragPreview?.arr() ?? null;
		const radius = itemStyle.radius;

		const handle = requestAnimationFrame(function draw() {
			const renderContext = currentCanvas.getContext("2d");
			if (renderContext == null) return;

			const ratio = activeWindow.devicePixelRatio || 1;
			if (
				currentCanvas.width != viewportWidth * ratio ||
				currentCanvas.height != viewportHeight * ratio
			) {
				currentCanvas.width = viewportWidth * ratio;
				currentCanvas.height = viewportHeight * ratio;
				currentCanvas.style.width = viewportWidth + "px";
				currentCanvas.style.height = viewportHeight + "px";
				renderContext.scale(ratio, ratio);
			}

			renderLayout(
				renderContext,
				viewport,
				radius,
				scrolledItems,
				previewItems,
			);
		});
		return () => {
			cancelAnimationFrame(handle);
		};
	});

	const elements = $derived(scrolled.items);
	$effect(() => {
		const currentHover = hover;
		if (currentHover instanceof HoveredItem) {
			const scrolledItems = scrolled.items;
			if (
				currentHover.element.offsetContains(
					currentHover.pos[0],
					currentHover.pos[1],
				)
			) {
				return;
			}
			const hoveredItem = scrolledItems.find((it) =>
				it.offsetContains(currentHover.pos[0], currentHover.pos[1]),
			);
			if (hoveredItem === undefined) {
				hover = null;
			} else {
				currentHover.element = hoveredItem;
			}
		}
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
			scrollVertically(scrollTop + event.deltaY / 16);
		}
	}

	let focusCausedByClick = $state(false);
	let mouseDownOn: Item | null = null;

	class DragPreview {
		private elements: DragPreviewElement<Item>[] = $state([]);

		constructor(
			items: Item[],
			private readonly onFinished: (
				modifications: {
					item: SourceItem;
					value: number;
					length: number;
					endValue: number;
				}[],
			) => Promise<void>,
		) {
			this.elements = items.map((selectedItem) => {
				selectedItem.hide();
				return new DragPreviewElement(
					selectedItem,
					selectedItem.item.value(),
					selectedItem.item.length(),
					selectedItem.item.value() + selectedItem.item.length(),
					selectedItem.offsetLeft + selectedItem.minSize / 2,
					selectedItem.backgroundColor,
					selectedItem.borderColor,
					selectedItem.strokeWidth,
				);
			});
		}

		forEach(cb: (element: DragPreviewElement<Item>) => void) {
			this.elements.forEach(cb);
			this.elements = this.elements.slice();
		}

		singleOrNull(): DragPreviewElement<Item> | null {
			return this.elements.length === 1 ? this.elements[0] : null;
		}

		arr(): readonly DragPreviewElement<Item>[] {
			return this.elements;
		}

		async finish() {
			try {
				await this.onFinished(this.movedItems());
			} finally {
				this.elements.forEach((it) => it.base.show());
			}
		}

		movedItems(): {
			item: SourceItem;
			value: number;
			length: number;
			endValue: number;
		}[] {
			return this.elements.map((it) => {
				return {
					value: it.value,
					length: it.length,
					endValue: it.endValue,
					item: it.base.item,
				};
			});
		}
	}

	let dragPreview: DragPreview | null = $state(null);

	function shouldExtendSelection(event: MouseEvent) {
		return (Platform.isMacOS && event.metaKey) || event.ctrlKey;
	}

	function createSelectionArea(
		x: number,
		y: number,
		width: number,
		height: number,
	) {
		selectionArea = {
			offsetLeft: x,
			offsetTop: y,
			offsetWidth: width,
			offsetHeight: height,
		};
	}

	function handleMouseDown(event: MouseEvent) {
		focusCausedByClick = true;

		if (!(hover instanceof HoveredItem) || hover.element == null) {
			focus = null;

			if (
				selectionBounds !== null &&
				boxContainsPoint(selectionBounds, event.offsetX, event.offsetY)
			) {
				if (prepareDragSelection(event)) {
					return;
				}
			}

			if (!shouldExtendSelection(event)) {
				selection.clear();
			}
			prepareMultiSelectDraw(event);
			return;
		}
		if (event.button === 2) {
			focusOn(hover.element, elements.indexOf(hover.element));
			return;
		}
		mouseDownOn = hover.element;
		if (!selection.has(mouseDownOn)) {
			if (shouldExtendSelection(event)) {
				selection.addAll([mouseDownOn]);
			} else {
				selection.replaceWith([mouseDownOn]);
			}
		}

		if (hover.side === "middle") {
			prepareDragSelection(event);
		} else {
			prepareResizeSelection(event, hover.side === "right");
		}
	}

	function prepareDragSelection(event: MouseEvent) {
		if (selection.isEmpty()) return false;
		const selectedItems = selection.items();

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

			if (dragPreview === null) {
				dragPreview = new DragPreview(selectedItems, onItemsChanged);
			}
			dragPreview.forEach((previousPreview) => {
				const item = previousPreview.base;
				const newItemValue = onPreviewNewItemValue(
					item.item,
					item.value() + deltaValue,
				);
				const newEndValue = onPreviewNewItemValue(
					item.item,
					newItemValue + item.item.length(),
				);
				const offsetCenterX =
					scale.toPixels(newItemValue - focalValue) +
					viewport.width / 2;

				previousPreview.value = newItemValue;
				previousPreview.endValue = newEndValue;
				previousPreview.length = newEndValue - newItemValue;
				previousPreview.offsetCenterX = offsetCenterX;
				previousPreview.offsetLeft = offsetCenterX - item.minSize / 2;
				previousPreview.offsetRight = offsetCenterX + item.offsetWidth;
			});

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
		async function releaseItemListener() {
			try {
				await dragPreview?.finish();
			} finally {
				dragPreview = null;
			}
			window.removeEventListener("mousemove", dragItemListener);
			window.removeEventListener("mouseup", releaseItemListener);
		}
		if (editable) {
			window.addEventListener("mouseup", releaseItemListener);
			window.addEventListener("mousemove", dragItemListener);
			return true;
		}
		return false;
	}

	function prepareResizeSelection(
		event: Pick<MouseEvent, "clientX">,
		pureResize: boolean,
	) {
		if (!editable || selection.isEmpty()) return;
		const selectedItems = selection.items();

		const startMouseValue =
			focalValue -
			scale.toValue(viewport.width / 2) -
			scale.toValue(stageCSSTarget!.getBoundingClientRect().left) +
			scale.toValue(event.clientX);

		function resizeSelection(event: Pick<MouseEvent, "clientX">) {
			const mouseValue =
				focalValue -
				scale.toValue(viewport.width / 2) -
				scale.toValue(stageCSSTarget!.getBoundingClientRect().left) +
				scale.toValue(event.clientX);

			const deltaValue = mouseValue - startMouseValue;

			if (dragPreview === null) {
				dragPreview = new DragPreview(selectedItems, onItemsChanged);
			}
			if (pureResize) {
				dragPreview.forEach((previewItem) => {
					const selectedItem = previewItem.base;

					previewItem.length =
						selectedItem.item.length() + deltaValue;
					previewItem.endValue =
						previewItem.value + previewItem.length;
					previewItem.offsetWidth =
						scale.toPixels(previewItem.length) +
						selectedItem.minSize;
					previewItem.offsetRight =
						previewItem.offsetLeft + previewItem.offsetWidth;
				});
			} else {
				dragPreview.forEach((previewItem) => {
					const selectedItem = previewItem.base;

					previewItem.value = selectedItem.item.value() + deltaValue;
					previewItem.length =
						previewItem.endValue - previewItem.value;

					previewItem.offsetWidth =
						scale.toPixels(previewItem.length) +
						selectedItem.minSize;
					previewItem.offsetLeft =
						previewItem.offsetRight - previewItem.offsetWidth;
				});
			}
		}

		const removeMouseMoveListener = on(
			window,
			"mousemove",
			resizeSelection,
		);
		on(
			window,
			"mouseup",
			async () => {
				removeMouseMoveListener();
				try {
					await dragPreview?.finish();
				} finally {
					dragPreview = null;
				}
			},
			{ once: true },
		);
	}

	let selectionArea = $state<null | OffsetBox>(null);
	const selection = new Selection<Item>();
	const selectionBounds = $derived.by(() => {
		if (selection.length() <= 1) return null;
		let offsetRight = -Infinity;
		let offsetBottom = -Infinity;
		const bounds = {
			offsetLeft: Infinity,
			offsetTop: Infinity,
			offsetWidth: 0,
			offsetHeight: 0,
		};

		// update when items are scrolled
		scrolled.items;

		for (const item of selection) {
			bounds.offsetLeft = Math.min(bounds.offsetLeft, item.offsetLeft);
			bounds.offsetTop = Math.min(bounds.offsetTop, item.offsetTop);
			offsetRight = Math.max(offsetRight, item.offsetRight);
			offsetBottom = Math.max(offsetBottom, item.offsetBottom);
		}
		bounds.offsetWidth = offsetRight - bounds.offsetLeft;
		bounds.offsetHeight = offsetBottom - bounds.offsetTop;
		return bounds;
	});

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

			const selectedItems: Item[] = [];
			// find all items in the selection area
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i];
				if (element.offsetLeft > maxX) {
					// no more of these ordered elements can intersect the
					// selection area
					break;
				}
				if (element.offsetIntersects(minX, minY, width, height)) {
					selectedItems.push(element);
				}
			}

			createSelectionArea(minX, minY, width, height);
			if (shouldExtendSelection(event)) {
				selection.addAll(selectedItems);
			} else {
				selection.replaceWith(selectedItems);
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
				scrollVertically(scrollTop + delta);
			} else if (event.clientY > startViewportBounds.bottom) {
				const delta =
					event.clientY -
					(startViewportBounds.bottom - viewport.padding.bottom);
				scrollVertically(scrollTop + delta);
			}
		}
		function releaseSelectionArea() {
			selectionArea = null;
			window.removeEventListener("mousemove", dragSelectionArea);
			window.removeEventListener("mouseup", releaseSelectionArea);
		}
		window.addEventListener("mouseup", releaseSelectionArea);
		window.addEventListener("mousemove", dragSelectionArea);
	}

	function handleMouseUp(event: MouseEvent) {
		if (event.button === 2) {
			if (
				selectionBounds !== null &&
				boxContainsPoint(selectionBounds, event.offsetX, event.offsetY)
			) {
				oncontextmenu(
					event,
					selection.items().map((it) => it.item),
				);
				return;
			}
			if (!(hover instanceof HoveredItem) || hover.element == null) {
				return;
			}
			oncontextmenu(event, [hover.element.item]);
			return;
		}
		if (mouseDownOn == null) {
			return;
		}
		const mouseWasDownOn = mouseDownOn;
		mouseDownOn = null;
		if (!(hover instanceof HoveredItem) || hover.element == null) {
			return;
		}
		if (hover.element !== mouseWasDownOn) {
			return;
		}

		focus = null;
		const hoveredItem = hover.element.item;
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

	class HoveredItem {
		#element: Item = $state(undefined as any as Item);
		get element() {
			// update when items scroll
			scrolled.items;
			return this.#element;
		}
		set element(element: Item) {
			this.#element = element;
		}
		side: "middle" | "left" | "right";
		/**
		 * keeps track of the moues position that caused the hover so it can
		 * be checked again when the timeline is scaled/scrolled
		 */
		pos: [number, number];
		constructor(
			element: Item,
			side: "middle" | "left" | "right",
			pos: [number, number],
		) {
			this.element = element;
			this.side = side;
			this.pos = pos;
		}
	}

	const WithinSelection = Symbol();

	let hover = $state<HoveredItem | typeof WithinSelection | null>(null);

	class Focus {
		#element: Item = $state(undefined as any as Item);
		get element() {
			// update when items scroll
			scrolled.items;
			return this.#element;
		}
		set element(element: Item) {
			this.#element = element;
		}
		index: number;
		constructor(index: number, element: Item) {
			this.element = element;
			this.index = index;
		}
	}
	let focus: Focus | null = $state(null);
	function verticalScrollToFocusItem(element: Item) {
		if (element.offsetTop < 0) {
			scrollVertically(element.offsetTop);
		} else if (element.offsetBottom > viewport.height) {
			scrollVertically(element.offsetBottom - viewport.height);
		}
	}
	function focusOn(element: Item, index: number, skipEvent: boolean = false) {
		if (!skipEvent) {
			dispatch("focus", element.item);
		}
		focus = new Focus(index, element);

		verticalScrollToFocusItem(element);

		if (focus.element.offsetLeft < 0) {
			dispatch("scrollToValue", focus.element.item.value());
		} else if (focus.element.offsetRight > viewport.width) {
			dispatch("scrollToValue", focus.element.item.value());
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
	export function focusOnId(id: string) {
		const index = elements.findIndex((element) => element.item.id === id);
		if (index >= 0) {
			focusOn(elements[index], index, true);
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
			selectionArea == null
		) {
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i];
				if (element.offsetContains(event.offsetX, event.offsetY)) {
					let side: "middle" | "left" | "right" = "middle";
					if (itemsResizable) {
						if (
							event.offsetX <
							element.offsetLeft + element.minSize / 2
						) {
							side = "left";
						} else if (
							event.offsetX >=
							element.offsetRight - element.minSize / 2
						) {
							side = "right";
						}
					}
					hover = new HoveredItem(element, side, [
						event.offsetX,
						event.offsetY,
					]);
					return;
				}
			}
			if (selectionBounds != null) {
				if (
					boxContainsPoint(
						selectionBounds,
						event.offsetX,
						event.offsetY,
					)
				) {
					hover = WithinSelection;
					return;
				}
			}
		}
		hover = null;
	}

	let scrollbarMeasurerFullWidth: number = $state(0);
	let scrollbarMeasurerInnerWidth: number = $state(0);
	let scrollbarWidth = $derived(
		scrollbarMeasurerFullWidth - scrollbarMeasurerInnerWidth,
	);
	const _clientWidth = $derived(viewport.width - scrollbarWidth);
	export function clientWidth() {
		return _clientWidth;
	}

	let scrollbarMeasurerFullHeight: number = $state(0);
	let scrollbarMeasurerInnerHeight: number = $state(0);
	let scrollbarHeight = $derived(
		scrollbarMeasurerFullHeight - scrollbarMeasurerInnerHeight,
	);

	function handleHScroll(event: ChangeEvent) {
		dispatch(
			"scrollToValue",
			focalValue +
				scale.toValue(event.detail.deltaPixels) / event.detail.ratio,
		);
	}

	function handleVScroll(event: ChangeEvent) {
		scrollVertically(event.detail.value);
	}
</script>

<div
	id="stage"
	bind:offsetWidth={viewport.width}
	bind:offsetHeight={viewport.height}
	bind:this={stageCSSTarget}
	aria-readonly={!editable}
	class:hovered={hover != null}
	data-hover-over-selection={hover === WithinSelection}
	data-hover-side={hover instanceof HoveredItem ? hover.side : undefined}
	style:--cross-axis-scroll="{scrollTop}px"
>
	<Background />
	<Padding
		onOffsetChange={(box) => {
			viewport.padding.top = box.top;
			viewport.padding.left = box.left;
			viewport.padding.right = box.right;
			viewport.padding.bottom = box.bottom;
		}}
	/>
	<SelectionArea area={selectionArea} />
	<SelectedBounds
		dragging={dragPreview != null}
		bounds={selectionBounds}
		selectedItemCount={selection.length()}
	/>
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
					scrollVertically(scrollTop - 10);
					break;
				case "ArrowDown":
					scrollVertically(scrollTop + 10);
					break;
				case "PageUp":
					scrollVertically(scrollTop - viewport.height);
					break;
				case "PageDown":
					scrollVertically(scrollTop + viewport.height);
					break;
				case "Home":
					scrollVertically(0);
					break;
				case "End":
					scrollVertically(maxScrollTop);
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
	{#if hover instanceof HoveredItem}
		<Hover
			position={hover.element}
			summary={summarizeItem(hover.element.item)}
		/>
	{/if}
	{#if dragPreview != null}
		{@const itemPreview = dragPreview.singleOrNull()}
		{#if itemPreview !== null}
			<DraggedItem
				position={itemPreview}
				summary={previewItem(
					itemPreview.base.item,
					itemPreview.base.name(),
					itemPreview.value,
					itemPreview.length,
					itemPreview.value + itemPreview.length,
				)}
			/>
		{/if}
	{/if}
	{#if focus != null}
		<FocusedItem focus={focus.element} />
	{/if}
	<Scrollbar
		style={`height: ${scrollbarHeight}px;`}
		orientation={"horizontal"}
		controls={"stage"}
		tabindex={timelineItems.length}
		value={scrollLeft}
		visibleAmount={viewport.width}
		min={Math.min(scrollLeft, scrolled.items[0]?.offsetLeft ?? 0)}
		max={Math.max(
			scrollLeft,
			scrolled.items[scrolled.items.length - 1]?.offsetRight ?? 0,
		)}
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
		tabindex={timelineItems.length + 1}
		value={scrollTop}
		visibleAmount={viewport.height}
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

<!-- CSS getters -->
<CssProp name="--item-margin-top" bind:value={itemStyle.margin.top} />
<CssProp name="--item-margin-left" bind:value={itemStyle.margin.left} />
<CssProp name="--item-margin-bottom" bind:value={itemStyle.margin.bottom} />
<CssProp name="--item-margin-right" bind:value={itemStyle.margin.right} />
<CssProp name="--item-size" bind:value={itemStyle.size} />
<CssProp name="--item-radius" bind:value={itemStyle.radius} />
<CssColorProp name="--item-color" bind:value={itemStyle.color} />
<CssProp
	name="--selected-item-border-width"
	bind:value={itemStyle.selected.borderWidth}
/>
<CssColorProp
	name="--selected-item-color"
	bind:value={itemStyle.selected.color}
/>
<CssColorProp
	name="--selected-item-border-color"
	bind:value={itemStyle.selected.borderColor}
/>

<style>
	div {
		--item-v-margin: max(var(--item-margin-top), var(--item-margin-bottom));
		--item-cross-axis-spacing: calc(
			var(--item-size) + var(--item-v-margin)
		);
	}

	div#stage {
		padding-top: var(--padding-top, 8px);
		padding-left: var(--padding-left, 8px);
		padding-bottom: var(--padding-bottom, 8px);
		padding-right: var(--padding-right, 48px);

		--timeline-item-diameter: var(--item-size);
		--timeline-item-radius: calc(var(--timeline-item-diameter) / 2);

		flex-grow: 1;
		position: relative;
		overflow: hidden;
		--scrollbar-width: var(--size-4-1);
	}
	div#stage.hovered[data-hover-side="middle"] {
		cursor: pointer;
	}
	div#stage.hovered[data-hover-side="left"] {
		cursor: e-resize;
	}
	div#stage.hovered[data-hover-side="right"] {
		cursor: w-resize;
	}
	div#stage:not(
			[aria-readonly="true"]
		).hovered[data-hover-over-selection="true"] {
		cursor: grab;
	}
	div#stage[aria-readonly="true"][data-hover-side="left"],
	div#stage[aria-readonly="true"][data-hover-side="right"] {
		cursor: pointer;
	}

	canvas {
		position: absolute;
		top: 0;
		left: 0;
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
