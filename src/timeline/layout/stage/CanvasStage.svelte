<script lang="ts" generics="T extends TimelineItemSource, SourceItem extends PlotAreaSourceItem<T>">
	import {createEventDispatcher} from "svelte";
	import {renderLayout} from "./draw";
	import {type OffsetBox} from "src/timeline/layout/stage/TimelineItemElement";
	import {type Scale} from "src/timeline/scale";
	import Hover from "./Hover.svelte";
	import {Platform} from "obsidian";
	import SelectionArea from "./CanvasSelectionArea.svelte";
	import SelectedBounds from "./SelectedBounds.svelte";
	import DraggedItem from "./DraggedItem.svelte";
	import {DragPreviewElement} from "src/timeline/layout/stage/drag.svelte";
	import {on} from "svelte/events";
	import {layoutItems, scaleItems} from "src/timeline/layout/stage/layout";
	import {PlotAreaItem, type PlotAreaSourceItem} from "src/timeline/layout/stage/item";
	import type {TimelineItemSource} from "src/timeline/item/TimelineItem.svelte";
	import {Selection} from "src/timeline/layout/stage/selection.svelte";
	import CssProp from "src/view/CSSProp.svelte";
	import CssColorProp from "src/view/CSSColorProp.svelte";
	import Background from "src/timeline/layout/stage/Background.svelte";
	import Padding from "src/timeline/layout/stage/Padding.svelte";
	import type {FitBounds} from "src/timeline/controls/navigation/zoomToFit";
	import {OverlayColor} from "src/color";
	import Scrollbars from "src/timeline/layout/stage/Scrollbars.svelte";
	import {PlotAreaHover, ResizeItemEdge} from "./hover.svelte";
	import {PlotAreaFocus} from "./focus.svelte";
	import Focus from "./Focus.svelte";
	import {PlotAreaContextMenu} from "./contextmenu";
	import {PlotAreaScrolling} from "./scrolling.svelte";
	import {PlotAreaItemCreation} from "./creation";

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
		select: {item: SourceItem; causedBy: Event};
		focus: SourceItem;
		create: {value: number; cause: Event};
	}>();

	interface Props {
		sortedItems: readonly SourceItem[];
		scale: Scale;
		focalValue: number;
		// todo: replace flags with object of methods. ie: null | { onMove?(): void; onResize?(): void }
		editable: boolean;
		itemsResizable: boolean;
		summarizeItem: (item: SourceItem) => string;
		previewItem: (item: SourceItem, name: string, value: number, length: number, endValue: number) => string;
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
	const selectedColorOverlay = $derived(new OverlayColor(itemStyle.selected.color));

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
		scaleItems(scale, items);
		return {
			items,
			_: Math.random(),
		};
	});

	const layout = $derived.by(() => {
		const plotAreaItems = scaled.items;
		layoutItems(itemStyle.size, itemStyle.margin, plotAreaItems);
		return {
			items: plotAreaItems,
			_: Math.random(),
		};
	});
	const scroll = new PlotAreaScrolling(
		() => stageCSSTarget?.getBoundingClientRect()?.top ?? 0,
		() => stageCSSTarget?.getBoundingClientRect()?.left ?? 0,
		() => viewport.width,
		() => viewport.height,
		() => scale,
		() => focalValue,
		() => viewport.padding,
		() => itemStyle.margin,
		() => layout.items,
		(deltaValue) => dispatch("scrollX", deltaValue),
		(focalValue) => dispatch("scrollToValue", focalValue),
		(constraints) => dispatch("zoomIn", constraints),
		(constraints) => dispatch("zoomOut", constraints),
	);
	const scrolled = $derived(scroll.scrolledItems());

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
			return {items: currentItems, _: Math.random()};
		}

		const selectedItemColor = selectedColorOverlay;
		const selectedItemBorder = {
			color: itemStyle.selected.borderColor,
			width: itemStyle.selected.borderWidth,
		};

		currentItems.forEach((it) => {
			const prefColor = it.color();
			if (selection.hasId(it.id)) {
				it.backgroundColor = selectedItemColor.blend(prefColor ?? itemColor);
				it.borderColor = selectedItemBorder.color;
				it.strokeWidth = selectedItemBorder.width;
			} else {
				it.backgroundColor = prefColor ?? itemColor;
				it.borderColor = prefColor ?? itemColor;
				it.strokeWidth = 0;
			}
		});
		return {items: currentItems, _: Math.random()};
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
			if (currentCanvas.width != viewportWidth * ratio || currentCanvas.height != viewportHeight * ratio) {
				currentCanvas.width = viewportWidth * ratio;
				currentCanvas.height = viewportHeight * ratio;
				currentCanvas.style.width = viewportWidth + "px";
				currentCanvas.style.height = viewportHeight + "px";
				renderContext.scale(ratio, ratio);
			}

			renderLayout(renderContext, viewport, radius, scrolledItems, previewItems);
		});
		return () => {
			cancelAnimationFrame(handle);
		};
	});

	const elements = $derived(scrolled.items);

	function handleScroll(event: WheelEvent) {
		scroll.wheel(event);
	}

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
					selectedItem.item.startValue(),
					selectedItem.item.length(),
					selectedItem.item.startValue() + selectedItem.item.length(),
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

	function createSelectionArea(x: number, y: number, width: number, height: number) {
		selectionArea = {
			offsetLeft: x,
			offsetTop: y,
			offsetWidth: width,
			offsetHeight: height,
		};
	}

	function handleMouseDown(event: MouseEvent) {
		focus.mousePressed();
		const action = hover.mouseDownAction();
		switch (action.name) {
			case "default": {
				if (!shouldExtendSelection(event)) {
					selection.clear();
				}
				prepareMultiSelectDraw(event);
				return;
			}
			case "select-item": /** pass through */
			case "resize-start": /** pass through */
			case "resize-end": {
				const item = action.item;
				mouseDownOn = item;
				if (!selection.hasId(item.id)) {
					if (shouldExtendSelection(event)) {
						selection.addAll([item]);
					} else {
						selection.replaceWith([item]);
					}
				}

				if ("edge" in action) {
					prepareResizeSelection(event, action.edge === ResizeItemEdge.Right);
				} else {
					prepareDragSelection(event);
				}

				return;
			}
			case "move-all": {
				prepareDragSelection(event);
				return;
			}
		}
	}

	function prepareDragSelection(event: MouseEvent) {
		if (selection.isEmpty()) return false;
		const selectedItems = selection.items(items);

		const startMouseValue =
			focalValue -
			scale.toValue(viewport.width / 2) -
			scale.toValue(stageCSSTarget!.getBoundingClientRect().left) +
			scale.toValue(event.clientX);

		function dragItemListener(event: MouseEvent) {
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
				const newItemValue = onPreviewNewItemValue(item.item, item.value() + deltaValue);
				const newEndValue = onPreviewNewItemValue(item.item, newItemValue + item.item.length());
				const offsetCenterX = scale.toPixels(newItemValue - focalValue) + viewport.width / 2;

				previousPreview.value = newItemValue;
				previousPreview.endValue = newEndValue;
				previousPreview.length = newEndValue - newItemValue;
				previousPreview.offsetCenterX = offsetCenterX;
				previousPreview.offsetLeft = offsetCenterX - item.minSize / 2;
				previousPreview.offsetRight = offsetCenterX + item.offsetWidth;
			});

			scroll.mouseDragged(event);
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

	function prepareResizeSelection(event: Pick<MouseEvent, "clientX">, pureResize: boolean) {
		if (!editable || selection.isEmpty()) return;
		const selectedItems = selection.items(items);

		const startMouseValue =
			focalValue -
			scale.toValue(viewport.width / 2) -
			scale.toValue(stageCSSTarget!.getBoundingClientRect().left) +
			scale.toValue(event.clientX);

		function resizeSelection(event: MouseEvent) {
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

					previewItem.length = selectedItem.item.length() + deltaValue;
					previewItem.endValue = previewItem.value + previewItem.length;
					previewItem.offsetWidth = scale.toPixels(previewItem.length) + selectedItem.minSize;
					previewItem.offsetRight = previewItem.offsetLeft + previewItem.offsetWidth;
				});
			} else {
				dragPreview.forEach((previewItem) => {
					const selectedItem = previewItem.base;

					previewItem.value = selectedItem.item.startValue() + deltaValue;
					previewItem.length = previewItem.endValue - previewItem.value;

					previewItem.offsetWidth = scale.toPixels(previewItem.length) + selectedItem.minSize;
					previewItem.offsetLeft = previewItem.offsetRight - previewItem.offsetWidth;
				});
			}

			scroll.mouseDragged(event);
		}

		const removeMouseMoveListener = on(window, "mousemove", resizeSelection);
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
			{once: true},
		);
	}

	let selectionArea = $state<null | OffsetBox>(null);
	const selection = new Selection<Item>();
	$effect(() => selection.updateItems(items));
	const selectedBounds = $derived.by(() => {
		if (selection.length() <= 1) return null;
		let offsetRight = -Infinity;
		let offsetBottom = -Infinity;
		const bounds = {
			offsetLeft: Infinity,
			offsetTop: Infinity,
			offsetWidth: 0,
			offsetHeight: 0,
		};

		for (const item of selection.items(scrolled.items)) {
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
		const startFocalValue = focalValue;
		const pageStartY = event.clientY - startViewportBounds.top + scroll.top();

		let isDragging = false;

		function dragSelectionArea(event: MouseEvent) {
			const scrolledStartX = startX - scale.toPixels(focalValue - startFocalValue);
			const scrolledStartY = pageStartY - scroll.top();
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

			scroll.mouseDragged(event);
		}
		function releaseSelectionArea() {
			selectionArea = null;
			window.removeEventListener("mousemove", dragSelectionArea);
			window.removeEventListener("mouseup", releaseSelectionArea);
		}
		window.addEventListener("mouseup", releaseSelectionArea);
		window.addEventListener("mousemove", dragSelectionArea);
	}

	const contextmenu = new PlotAreaContextMenu(
		() => selectedBounds,
		() => selection.items(items),
		() => hover.item(),
		(cause, items) =>
			oncontextmenu(
				cause,
				items.map((it) => it.item),
			),
	);

	function handleMouseUp(event: MouseEvent) {
		focus.mouseReleased(event);
		hover.mouseReleased(event);
		contextmenu.mouseReleased(event);
		if (event.button === 2) return;

		if (mouseDownOn == null) {
			return;
		}
		const mouseWasDownOn = mouseDownOn;
		mouseDownOn = null;
		const hoveredItem = hover.item();
		if (hoveredItem?.item !== mouseWasDownOn) {
			return;
		}

		if (!shouldExtendSelection(event)) {
			dispatch("select", {
				item: hoveredItem.item.item,
				causedBy: event,
			});
		}
	}

	const creation = new PlotAreaItemCreation(
		() => editable,
		() => hover.item(),
		() => scale,
		() => focalValue,
		() => viewport.width,
		(value, cause) => dispatch("create", {value, cause}),
	);

	const hover = new PlotAreaHover(
		() => scrolled.items,
		() => selectedBounds,
		() => (scrollbars?.dragging() ? {} : (dragPreview ?? selectionArea)),
		() => itemStyle.size,
		() => itemsResizable,
		() => editable,
	);
	const focus = new PlotAreaFocus(
		{
			hoveredItem: () => hover.item(),
			items: () => scrolled.items,
			scrollIntoView(item) {
				scroll.scrollToItem(item);
			},
		},
		(item, _index) => dispatch("focus", item.item),
	);
	$effect(() => focus.follow());

	export function focusOnId(id: string) {
		focus.focusOnId(id);
	}

	let scrollbars = $state<Scrollbars | null>(null);

	export function clientWidth() {
		return scrollbars?.getClientWidth() ?? 0;
	}

	const id = "timeline-view--plotarea-" + Math.random().toString(36).slice(2);
</script>

<div
	{id}
	class="timeline-view--plotarea"
	bind:offsetWidth={viewport.width}
	bind:offsetHeight={viewport.height}
	bind:this={stageCSSTarget}
	aria-readonly={!editable}
	data-hover-action={hover.mouseDownAction().name}
	style:--cross-axis-scroll="{scroll.top()}px"
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
	<SelectedBounds dragging={dragPreview != null} bounds={selectedBounds} selectedItemCount={selection.length()} />
	<canvas
		bind:this={canvas}
		tabindex={0}
		onwheelcapture={(e) => {
			e.stopPropagation();
			handleScroll(e);
		}}
		onmouseleave={() => hover.clear()}
		onmousemove={(e) => hover.mouseMoved(e.offsetX, e.offsetY)}
		onmousedown={handleMouseDown}
		onmouseup={handleMouseUp}
		ondblclick={(e) => creation.dblClick(e)}
		onfocus={(e) => focus.focused(e)}
		onkeydown={(event) => {
			scroll.keyPressed(event);
			focus.keyPressed(event);
		}}
	></canvas>
	<Hover hovered={hover.item()} summaryOf={(it) => summarizeItem(it.item)} positionOf={(it) => it} />
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
	<Focus focused={focus.focusedBounds(scrolled.items)} />
	<Scrollbars
		bind:this={scrollbars}
		tabIndex={timelineItems.length}
		{id}
		scrollHeight={scroll.height()}
		scrollTop={scroll.top()}
		minLeftOffset={scrolled.items[0]?.offsetLeft ?? 0}
		maxRightOffset={scrolled.items[scrolled.items.length - 1]?.offsetRight ?? 0}
		onVScroll={(e) => scroll.verticalScrollbarChanged(e)}
		onHScroll={(e) => scroll.horizontalScrollbarChanged(e)}
	/>

	<!-- CSS getters -->
	<CssProp name="--item-margin-top" bind:value={itemStyle.margin.top} />
	<CssProp name="--item-margin-left" bind:value={itemStyle.margin.left} />
	<CssProp name="--item-margin-bottom" bind:value={itemStyle.margin.bottom} />
	<CssProp name="--item-margin-right" bind:value={itemStyle.margin.right} />
	<CssProp name="--item-size" bind:value={itemStyle.size} />
	<CssProp name="--item-radius" bind:value={itemStyle.radius} />
	<CssColorProp name="--item-color" bind:value={itemStyle.color} />
	<CssProp name="--selected-item-border-width" bind:value={itemStyle.selected.borderWidth} />
	<CssColorProp name="--selected-item-color" bind:value={itemStyle.selected.color} />
	<CssColorProp name="--selected-item-border-color" bind:value={itemStyle.selected.borderColor} />
</div>

<style>
	div {
		--item-v-margin: max(var(--item-margin-top), var(--item-margin-bottom));
		--item-cross-axis-spacing: calc(var(--item-size) + var(--item-v-margin));
	}

	div {
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

	div[data-hover-action="resize-start"] {
		cursor: e-resize;
	}
	div[data-hover-action="resize-end"] {
		cursor: w-resize;
	}
	div[data-hover-action="select-item"] {
		cursor: pointer;
	}
	div[data-hover-action="move-all"] {
		cursor: grab;
	}

	canvas {
		position: absolute;
		top: 0;
		left: 0;
	}
</style>
