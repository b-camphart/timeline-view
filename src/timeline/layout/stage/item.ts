import type {
	TimelineItem,
	TimelineItemSource,
} from "src/timeline/item/TimelineItem.svelte";
import type { Scale } from "src/timeline/scale";

export type PlotAreaSourceItem<T extends TimelineItemSource> = Omit<
	TimelineItem<T>,
	"setValue" | "setLength"
>;

export class PlotAreaItem<
	T extends TimelineItemSource,
	S extends PlotAreaSourceItem<T>,
> {
	static #byItem = new WeakMap<
		PlotAreaSourceItem<any>,
		PlotAreaItem<any, any>
	>();
	static from<T extends TimelineItemSource, S extends PlotAreaSourceItem<T>>(
		item: S,
	): PlotAreaItem<T, S> {
		const existingItem = PlotAreaItem.#byItem.get(item);
		if (existingItem !== undefined) {
			return existingItem;
		}
		const newItem = new PlotAreaItem<T, S>(item);
		PlotAreaItem.#byItem.set(item, newItem);
		return newItem;
	}
	private constructor(readonly item: S) {}
	get id() {
		return this.item.id;
	}
	name() {
		return this.item.name();
	}
	color() {
		return this.item.color();
	}
	get source() {
		return this.item.source;
	}
	value() {
		return this.item.value();
	}
	length() {
		return this.item.length();
	}

	valuePx = 0;
	lengthPx = 0;
	scale(scale: Scale) {
		const item = this.item;
		this.valuePx = scale.toPixels(item.value());
		this.lengthPx = scale.toPixels(item.length());
	}

	layoutTop = 0;
	layoutLeft = 0;
	layoutBottom = 0;
	layoutRight = 0;
	minSize = 0;
	layout(
		top: number,
		left: number,
		bottom: number,
		right: number,
		minSize: number,
		width: number,
		height: number,
	) {
		this.layoutTop = top;
		this.layoutLeft = left;
		this.layoutBottom = bottom;
		this.layoutRight = right;
		this.minSize = minSize;
		// these don't change with scroll, so we can set them here
		this.offsetWidth = width;
		this.offsetHeight = height;
	}

	offsetTop = 0;
	offsetLeft = 0;
	offsetRight = 0;
	offsetBottom = 0;
	offsetWidth = 0;
	offsetHeight = 0;
	scroll(scrollTop: number, scrollLeft: number) {
		this.offsetTop = this.layoutTop - scrollTop;
		this.offsetBottom = this.layoutBottom - scrollTop;
		this.offsetLeft = this.layoutLeft - scrollLeft;
		this.offsetRight = this.layoutRight - scrollLeft;
	}

	offsetContains(x: number, y: number) {
		return (
			this.offsetLeft <= x &&
			x < this.offsetRight &&
			this.offsetTop <= y &&
			y < this.offsetBottom
		);
	}

	offsetIntersects(left: number, top: number, width: number, height: number) {
		return (
			((left >= this.offsetLeft && left < this.offsetRight) ||
				(this.offsetLeft >= left && this.offsetLeft < left + width)) &&
			((top >= this.offsetTop && top < this.offsetBottom) ||
				(this.offsetTop >= top && this.offsetTop < top + height))
		);
	}

	backgroundColor: string = "";
	borderColor: string = "";
	strokeWidth: number = 0;
	visible: boolean = true;
	show() {
		this.visible = true;
	}
	hide() {
		this.visible = false;
	}
}
