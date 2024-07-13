import type { TimelineItem } from "src/timeline/Timeline";

export interface OffsetBox {
	readonly offsetTop: number;
	readonly offsetLeft: number;
	readonly offsetWidth: number;
	readonly offsetHeight: number;

	readonly offsetBottom: number;
	readonly offsetRight: number;
	readonly offsetCenterX: number;
	readonly offsetCenterY: number;
}

export function boxContainsPoint(box: OffsetBox, x: number, y: number) {
	return (
		box.offsetLeft <= x &&
		x < box.offsetRight &&
		box.offsetTop <= y &&
		y < box.offsetBottom
	);
}

export class TimelineLayoutItem {
	constructor(
		public item: TimelineItem,
		public centerX: number = 0,
		public centerY: number = 0,
		public radius: number = 0,
	) {}

	left() {
		return this.centerX - this.radius;
	}

	right() {
		return this.centerX + this.radius;
	}

	top() {
		return this.centerY - this.radius;
	}

	bottom() {
		return this.centerY + this.radius;
	}
}

export class TimelineItemElement {
	constructor(
		public layoutItem: TimelineLayoutItem,
		public offsetLeft: number = 0,
		public offsetRight: number = 0,
		public offsetTop: number = 0,
		public offsetWidth: number = 0,
		public offsetHeight: number = 0,
		public offsetBottom: number = 0,
		public offsetCenterX: number = 0,
		public offsetCenterY: number = 0,
	) {}

	contains(x: number, y: number) {
		return (
			this.offsetLeft <= x &&
			x < this.offsetRight &&
			this.offsetTop <= y &&
			y < this.offsetBottom
		);
	}

	get backgroundColor() {
		return this.layoutItem.item.color();
	}
}
