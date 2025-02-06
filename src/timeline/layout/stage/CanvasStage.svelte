<script
	lang="ts"
	generics="T extends TimelineItemSource, SourceItem extends PlotAreaSourceItem<T>"
>
	import { run } from "svelte/legacy";

	import { createEventDispatcher, onMount, untrack } from "svelte";
	import { renderLayout } from "./draw";
	import { TimelineItemElementStyle } from "src/timeline/layout/stage/TimelineItemElement";
	import { type Scale } from "src/timeline/scale";
	import Scrollbar from "src/view/controls/Scrollbar.svelte";
	import type { ChangeEvent } from "src/view/controls/Scrollbar";
	import Hover from "./Hover.svelte";
	import FocusedItem from "./FocusedItem.svelte";
	import { Platform } from "obsidian";
	import SelectionArea from "./CanvasSelectionArea.svelte";
	import SelectedBounds from "./SelectedBounds.svelte";
	import DraggedItem from "./DraggedItem.svelte";
	import Background from "src/timeline/layout/stage/Background.svelte";
	import { DragPreviewElement } from "src/timeline/layout/stage/drag.svelte";
	import { on } from "svelte/events";
	import { layoutItems } from "src/timeline/layout/stage/layout";
	import {
		PlotAreaItem,
		type PlotAreaSourceItem,
	} from "src/timeline/layout/stage/item";
	import type { TimelineItemSource } from "src/timeline/item/TimelineItem.svelte";

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
		width?: number;
		clientWidth?: number;
		clientHeight?: number;
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
		width = $bindable(0),
		clientWidth = $bindable(0),
		clientHeight = $bindable(0),
		editable,
		itemsResizable,
		summarizeItem,
		previewItem,
		onPreviewNewItemValue = (_, value) => value,
		oncontextmenu = () => {},
		onItemsChanged = async () => {},
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

	const item = $state({
		width: 0,
		height: 0,
		margin: {
			horizontal: 0,
			vertical: 0,
		},
	});

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

		const reportedWidth =
			viewport.width -
			viewport.padding.left -
			viewport.padding.right -
			item.width -
			item.margin.horizontal;

		if (width != reportedWidth) {
			width = reportedWidth;
		}
	});

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
		layoutItems(
			item.height / 2,
			{
				top: item.margin.vertical,
				left: item.margin.horizontal,
				bottom: item.margin.vertical,
				right: item.margin.horizontal,
			},
			plotAreaItems,
		);
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
	let baseItemStyle = $state(TimelineItemElementStyle.unstyled);
	let selectedItemStyle = $state(TimelineItemElementStyle.unstyled);
	onMount(() => {
		let cancelled = false;
		function queryItemStyle() {
			if (cancelled) return;

			const base = pointElements.base,
				selected = pointElements.selected;
			if (base === undefined || selected === undefined) {
				requestAnimationFrame(queryItemStyle);
				return;
			}

			const style = TimelineItemElementStyle.fromCSS(
					getComputedStyle(base),
				),
				selectedStyle = TimelineItemElementStyle.fromCSS(
					getComputedStyle(selected),
				);
			if (!style.equals(baseItemStyle)) {
				baseItemStyle = style;
			}
			if (!selectedStyle.equals(selectedItemStyle)) {
				selectedItemStyle = selectedStyle;
			}

			requestAnimationFrame(queryItemStyle);
		}
		queryItemStyle();

		return () => {
			cancelled = true;
		};
	});

	const styled = $derived.by(() => {
		const currentItems = items;
		const selectedItems = selection.selectedItems;
		const currentItemStyle = baseItemStyle;

		if (selectedItems.size > 0) {
			const currentSelectedStyle = selectedItemStyle;
			currentItems.forEach((it) => {
				const prefColor = it.color();
				if (selectedItems.has(it.id)) {
					it.backgroundColor = prefColor ?? currentSelectedStyle.fill;
					it.borderColor = currentSelectedStyle.stroke;
					it.strokeWidth = currentSelectedStyle.strokeWidth;
				} else {
					it.backgroundColor = prefColor ?? currentItemStyle.fill;
					it.borderColor = prefColor ?? currentItemStyle.stroke;
					it.strokeWidth = currentItemStyle.strokeWidth;
				}
			});
		} else {
			currentItems.forEach((it) => {
				const prefColor = it.color();
				it.backgroundColor = prefColor ?? currentItemStyle.fill;
				it.borderColor = prefColor ?? currentItemStyle.stroke;
				it.strokeWidth = currentItemStyle.strokeWidth;
			});
		}
		return { items: currentItems, _: Math.random() };
	});

	$effect(() => {
		const currentCanvas = canvas;
		if (currentCanvas === undefined) return;

		const scrolledItems = scrolled.items;
		// re-style should trigger a redraw
		styled.items;
		const previewItems = dragPreview?.arr() ?? null;

		const handle = requestAnimationFrame(function draw() {
			const renderContext = currentCanvas.getContext("2d");
			if (renderContext == null) return;

			const ratio = activeWindow.devicePixelRatio || 1;
			if (
				currentCanvas.width != viewport.width * ratio ||
				currentCanvas.height != viewport.height * ratio
			) {
				currentCanvas.width = viewport.width * ratio;
				currentCanvas.height = viewport.height * ratio;
				currentCanvas.style.width = viewport.width + "px";
				currentCanvas.style.height = viewport.height + "px";
				renderContext.scale(ratio, ratio);
			}

			renderLayout(renderContext, viewport, scrolledItems, previewItems);
		});
		return () => {
			cancelAnimationFrame(handle);
		};
	});

	const elements = $derived(scrolled.items);
	$effect(() => {
		const currentHover = hover;
		if (currentHover !== null) {
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
					selectedItem.offsetLeft + selectedItem.layoutRadius,
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

	function clearSelection() {
		selection.selectedItems = new Map();
		selection = selection;
	}
	function selectElement(element: Item) {
		if (selection.selectedItems.has(element.source.id)) return;
		clearSelection();
		selection.selectedItems = new Map([[element.source.id, element]]);
		selection = selection;
	}
	function selectElements(elements: Item[]) {
		clearSelection();
		selection.selectedItems = new Map(
			elements.map((it) => [it.source.id, it]),
		);

		selection = selection;
	}
	function shouldExtendSelection(event: MouseEvent) {
		return (Platform.isMacOS && event.metaKey) || event.ctrlKey;
	}
	function includeElementInSelection(element: Item) {
		selection.selectedItems.set(element.source.id, element);

		selection = selection;
	}
	function includeElementsInSelection(elements: Item[]) {
		for (const element of elements) {
			selection.selectedItems.set(element.source.id, element);
		}

		selection = selection;
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
	function selectionBounds(elements: Iterable<Item>) {
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
		if (!selection.selectedItems.has(mouseDownOn.source.id)) {
			if (shouldExtendSelection(event)) {
				includeElementInSelection(mouseDownOn);
			} else {
				selectElement(mouseDownOn);
			}
		}

		if (hover.side === "middle") {
			prepareDragSelection(event);
		} else {
			prepareResizeSelection(event, hover.side === "right");
		}
	}

	function prepareDragSelection(event: MouseEvent) {
		const selectedItems = Array.from(selection.selectedItems.values());
		if (selectedItems.length === 0) {
			return;
		}

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
				previousPreview.offsetLeft =
					offsetCenterX - item.offsetHeight / 2;
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
		}
	}

	function prepareResizeSelection(
		event: Pick<MouseEvent, "clientX">,
		pureResize: boolean,
	) {
		if (!editable) return;
		const selectedItems = Array.from(selection.selectedItems.values());
		if (selectedItems.length === 0) {
			return;
		}

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
						selectedItem.offsetHeight;
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
						selectedItem.offsetHeight;
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

	let selection: {
		area: null | {
			offsetLeft: number;
			offsetTop: number;
			offsetWidth: number;
			offsetHeight: number;
		};
		selectedItems: Map<string, Item>;
		readonly bounds: null | {
			offsetLeft: number;
			offsetTop: number;
			offsetWidth: number;
			offsetHeight: number;
		};
	} = $state({
		area: null,
		selectedItems: new Map(),
		get bounds() {
			if (this.selectedItems.size <= 1) return null;
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

			for (const item of this.selectedItems.values()) {
				bounds.offsetLeft = Math.min(
					bounds.offsetLeft,
					item.offsetLeft,
				);
				bounds.offsetTop = Math.min(bounds.offsetTop, item.offsetTop);
				offsetRight = Math.max(offsetRight, item.offsetRight);
				offsetBottom = Math.max(offsetBottom, item.offsetBottom);
			}
			bounds.offsetWidth = offsetRight - bounds.offsetLeft;
			bounds.offsetHeight = offsetBottom - bounds.offsetTop;
			return bounds;
		},
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
				scrollVertically(scrollTop + delta);
			} else if (event.clientY > startViewportBounds.bottom) {
				const delta =
					event.clientY -
					(startViewportBounds.bottom - viewport.padding.bottom);
				scrollVertically(scrollTop + delta);
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
			oncontextmenu(event, [hover.element.item]);
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

	let hover = $state<HoveredItem | null>(null);

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
			selection.area == null
		) {
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i];
				if (element.offsetContains(event.offsetX, event.offsetY)) {
					let side: "middle" | "left" | "right" = "middle";
					if (itemsResizable) {
						side =
							event.offsetX <
							element.offsetLeft + element.offsetHeight / 4
								? "left"
								: event.offsetX >
									  element.offsetRight -
											element.offsetHeight / 4
									? "right"
									: "middle";
					}
					hover = new HoveredItem(element, side, [
						event.offsetX,
						event.offsetY,
					]);
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
	$effect(() => {
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
	});
</script>

<div
	id="stage"
	bind:this={stageCSSTarget}
	aria-readonly={!editable}
	class:hovered={hover != null}
	data-hover-side={hover != null ? hover.side : undefined}
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
						(it) => it.item,
					),
				);
			}
		}}
		onwheel={handleScroll}
	/>
	{#if hover != null}
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
	div#stage.hovered[data-hover-side="middle"] {
		cursor: pointer;
	}
	div#stage.hovered[data-hover-side="left"] {
		cursor: e-resize;
	}
	div#stage.hovered[data-hover-side="right"] {
		cursor: w-resize;
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
