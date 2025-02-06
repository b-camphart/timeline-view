import type {TimelineItem} from "src/timeline/item/TimelineItem";
import type {Scale} from "src/timeline/scale";
import {untrack} from "svelte";

export type PlotAreaSourceItem<T> = Readonly<TimelineItem<T>>;

export class PlotAreaItem<T> {
	static #byItem = new WeakMap<PlotAreaSourceItem<any>, PlotAreaItem<any>>();
	static from<T>(item: PlotAreaSourceItem<T>): PlotAreaItem<T> {
		const existingItem = PlotAreaItem.#byItem.get(item);
		if (existingItem !== undefined) {
			untrack(() => (existingItem.#item = item));
			return existingItem;
		}
		const newItem = new PlotAreaItem(item);
		PlotAreaItem.#byItem.set(item, newItem);
		return newItem;
	}
	private constructor(item: PlotAreaSourceItem<T>) {
		this.#item = item;
	}
	#item: PlotAreaSourceItem<T> = $state(undefined as any as PlotAreaSourceItem<T>);
	get item() {
		return this.#item;
	}
	temporaryReplacement(item: PlotAreaSourceItem<T>) {
		this.#item = item;
	}
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
	get value() {
		return this.item.value;
	}
	get length() {
		return this.item.length;
	}

	valuePx = 0;
	lengthPx = 0;
	scale(scale: Scale) {
		const item = this.item;
		this.valuePx = scale.toPixels(item.value);
		this.lengthPx = scale.toPixels(item.length);
	}

	layoutTop = 0;
	layoutLeft = 0;
	layoutBottom = 0;
	layoutRight = 0;
	layoutRadius = 0;
	layout(top: number, left: number, bottom: number, right: number, radius: number, width: number, height: number) {
		this.layoutTop = top;
		this.layoutLeft = left;
		this.layoutBottom = bottom;
		this.layoutRight = right;
		this.layoutRadius = radius;
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
		return this.offsetLeft <= x && x < this.offsetRight && this.offsetTop <= y && y < this.offsetBottom;
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
