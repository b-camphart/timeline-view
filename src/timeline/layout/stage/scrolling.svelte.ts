import type {Scale} from "src/timeline/scale";
import type {ChangeEvent} from "src/view/controls/Scrollbar";
import {untrack} from "svelte";
import type {OffsetBox} from "./TimelineItemElement";

/**
 * Encapsulates scroll logic for the plot area
 */
export class PlotAreaScrolling<
	LayoutItem extends Readonly<{layoutBottom: number; scroll(top: number, left: number): void}>,
> {
	constructor(
		/** the top offset of the plotarea within the window's client area (same coord system as MouseEvent.client*) */
		private readonly clientTop: () => number,
		/** the left offset of the plotarea within the window's client area (same coord system as MouseEvent.client*) */
		private readonly clientLeft: () => number,
		private readonly clientWidth: () => number,
		private readonly clientHeight: () => number,
		private readonly scale: () => Scale,
		private readonly focalValue: () => number,
		private readonly padding: () => Readonly<{top: number; bottom: number; left: number; right: number}>,
		private readonly itemMargin: () => Readonly<{top: number; bottom: number}>,
		private readonly layoutItems: () => readonly LayoutItem[],

		private readonly scrollFocalValue: (delta: number) => void,
		private readonly setFocalValue: (focalValue: number) => void,
		private readonly zoomIn: (constraints: {keepValue: number; at: number; within: number}) => void,
		private readonly zoomOut: (constraints: {keepValue: number; at: number; within: number}) => void,
	) {}

	/**
	 * Following DOM convensions, represents the full height of the plotarea including padding
	 */
	height() {
		return this.$scrollHeight;
	}

	private readonly $scrollHeight = $derived(this.#scrollHeight());

	#scrollHeight() {
		const padding = this.padding();
		const maxBottom = Math.max(...this.layoutItems().map((it) => it.layoutBottom));
		return padding.top + maxBottom + padding.bottom;
	}

	top() {
		return Math.min(this.#top, this.#maxTop());
	}

	setTop(scrollTop: number) {
		this.#top = Math.max(
			0,
			Math.min(
				untrack(() => this.#maxTop()),
				scrollTop,
			),
		);
	}

	#top = $state(0);
	#maxTop() {
		return Math.max(0, this.height() - this.clientHeight());
	}

	left() {
		return this.$left;
	}

	private readonly $left = $derived(this.#left());

	#left() {
		return this.scale().toPixels(this.focalValue()) - this.clientWidth() / 2;
	}

	scrolledItems() {
		const layoutItems = this.layoutItems();
		const top = this.top() - this.padding().top;
		const left = this.left();
		layoutItems.forEach((it) => it.scroll(top, left));
		return {
			items: layoutItems,
		};
	}

	wheel(event: WheelEvent) {
		if (event.shiftKey) {
			this.scrollFocalValue(this.scale().toValue(event.deltaY));
			if (event.deltaX !== 0) {
				this.setTop(this.top() + event.deltaX);
			}
		} else if (event.ctrlKey) {
			const mouseOffsetX = event.clientX - this.clientLeft();
			const xRelativeToMiddle = mouseOffsetX - this.clientWidth() / 2;
			const zoomFocusValue = this.focalValue() + this.scale().toValue(xRelativeToMiddle);

			if (event.deltaY > 0) {
				this.zoomOut({
					keepValue: zoomFocusValue,
					at: xRelativeToMiddle,
					within: this.clientWidth(),
				});
			} else if (event.deltaY < 0) {
				this.zoomIn({
					keepValue: zoomFocusValue,
					at: xRelativeToMiddle,
					within: this.clientWidth(),
				});
			}
		} else {
			this.setTop(this.top() + event.deltaY);
			if (event.deltaX !== 0) {
				this.scrollFocalValue(this.scale().toValue(event.deltaX));
			}
		}
	}

	keyPressed(event: KeyboardEvent) {
		switch (event.key) {
			case "ArrowLeft":
				this.scrollFocalValue(this.scale().toValue(-10));
				break;
			case "ArrowRight":
				this.scrollFocalValue(this.scale().toValue(10));
				break;
			case "ArrowUp":
				this.setTop(this.top() - 10);
				break;
			case "ArrowDown":
				this.setTop(this.top() + 10);
				break;
			case "PageUp":
				this.setTop(this.top() - this.clientHeight());
				break;
			case "PageDown":
				this.setTop(this.top() + this.clientHeight());
				break;
			case "Home":
				this.setTop(0);
				break;
			case "End":
				this.setTop(this.#maxTop());
				break;
		}
	}

	verticalScrollbarChanged(event: ChangeEvent) {
		this.setTop(event.detail.value);
	}

	horizontalScrollbarChanged(event: ChangeEvent) {
		this.scrollFocalValue(this.scale().toValue(event.detail.deltaPixels) / event.detail.ratio);
	}

	scrollToItem(
		element: {
			item: {
				startValue(): number;
			};
			layoutTop: number;
			layoutBottom: number;
		} & OffsetBox,
	) {
		if (element.offsetTop < 0) {
			this.setTop(element.layoutTop - this.padding().top - this.itemMargin().top);
		} else if (element.offsetTop + element.offsetHeight > this.clientHeight()) {
			this.setTop(element.layoutBottom - this.clientHeight() + this.padding().bottom + this.itemMargin().bottom);
		}

		if (element.offsetLeft < 0 || element.offsetLeft + element.offsetWidth > this.clientWidth()) {
			this.setFocalValue(element.item.startValue());
		}
	}

	mouseDragged(event: MouseEvent) {
		const leftThreshold = this.clientLeft() + this.padding().left;
		const rightThreshold = this.clientLeft() + this.clientWidth() - this.padding().right;
		if (event.clientX < leftThreshold) {
			const delta = event.clientX - leftThreshold;
			this.scrollFocalValue(this.scale().toValue(delta));
		} else if (event.clientX > rightThreshold) {
			const delta = event.clientX - rightThreshold;
			this.scrollFocalValue(this.scale().toValue(delta));
		}

		const topThreshold = this.clientTop() + this.padding().top;
		const bottomThreashold = this.clientTop() + this.clientHeight() - this.padding().bottom;
		if (event.clientY < topThreshold) {
			const delta = event.clientY - topThreshold;
			this.setTop(this.top() + delta);
		} else if (event.clientY > bottomThreashold) {
			const delta = event.clientY - bottomThreashold;
			this.setTop(this.top() + delta);
		}
	}
}
