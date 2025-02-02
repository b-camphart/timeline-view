import type {BackgroundColor, CanvasElement} from "src/timeline/layout/stage/CanvasStage";
import {LayoutItem} from "src/timeline/layout/stage/layout";
import type {TimelineItemElementStyle} from "src/timeline/layout/stage/TimelineItemElement";
import type {TimelineItem} from "src/timeline/Timeline";

class PlotAreaItem implements CanvasElement, LayoutItem {
	constructor(source: TimelineItem, backgroundColor: BackgroundColor | undefined) {
		this.item = source;
		this.#prefBackgroundColor = backgroundColor;
	}

	item: TimelineItem;
	top: number = 0;
	left: number = 0;
	bottom: number = 0;
	right: number = 0;
	radius: number = 0;
	layout(top: number, left: number, bottom: number, right: number, radius: number): void {
		this.top = top;
		this.left = left;
		this.bottom = bottom;
		this.right = right;
		this.radius = radius;
		this.offsetWidth = right - left;
		this.offsetHeight = bottom - top;
	}

	offsetWidth: number = 0;
	offsetHeight: number = 0;

	offsetTop: number = 0;
	offsetBottom: number = 0;
	offsetLeft: number = 0;
	offsetRight: number = 0;

	scroll(scrollLeft: number, scrollTop: number) {
		this.offsetLeft = this.left - scrollLeft;
		this.offsetRight = this.right - scrollLeft;
		this.offsetTop = this.top - scrollTop;
		this.offsetBottom = this.bottom - scrollTop;
	}

	/**
	 * Checks if this item intersects with provided area, using the element's
	 * scrolled position
	 */
	intersectsScrolled(left: number, top: number, width: number, height: number) {
		return (
			((left >= this.offsetLeft && left < this.offsetRight) ||
				(this.offsetLeft >= left && this.offsetLeft < left + width)) &&
			((top >= this.offsetTop && top < this.offsetBottom) ||
				(this.offsetTop >= top && this.offsetTop < top + height))
		);
	}

	/**
	 * Checks if this item contains the provided point, using the element's
	 * scrolled position
	 */
	containsScrolled(x: number, y: number) {
		return this.offsetLeft <= x && x < this.offsetRight && this.offsetTop <= y && y < this.offsetBottom;
	}

	visible: boolean = true;
	hide() {
		this.visible = false;
	}
	show() {
		this.visible = true;
	}

	#prefBackgroundColor: BackgroundColor | undefined;
	backgroundColor: BackgroundColor | undefined;
	borderColor: BackgroundColor | undefined;
	strokeWidth: number | undefined;

	applyStyle(style: TimelineItemElementStyle) {
		this.backgroundColor = this.#prefBackgroundColor ?? style.fill;
		this.borderColor = style.stroke;
		this.strokeWidth = style.strokeWidth;
	}
}
export {type PlotAreaItem};
export function plotAreaItem(source: TimelineItem) {
	return new PlotAreaItem(source, source.color());
}
