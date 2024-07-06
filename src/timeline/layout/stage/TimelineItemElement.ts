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

/**
 * A quasi-element representing the current position of a timeline item on the canvas
 */
export class TimelineItemCanvasElement implements OffsetBox {
	/**
	 * The visual top of the item within the canvas (unscrolled)
	 */
	public offsetTop: number = 0;

	/**
	 * The visual left of the item within the canvas, assuming 0 value is at 0 in the viewport
	 */
	public offsetLeft: number = 0;

	constructor(
		centerX: number,
		centerY: number,
		radius: number,
		public item: TimelineItem,
	) {
		this.offsetLeft = centerX - radius;
		this.offsetTop = centerY - radius;

		this.offsetWidth = radius * 2;
		this.offsetHeight = radius * 2;

		this.offsetCenterX = centerX;
		this.offsetCenterY = centerY;
		this.offsetBottom = centerY + radius;
		this.offsetRight = centerX + radius;

		this.style = {
			get backgroundColor() {
				return item.color();
			},
		};
	}

	public readonly style;

	public offsetWidth: number = 0;
	public offsetHeight: number = 0;
	public offsetBottom: number = 0;
	public offsetRight: number = 0;
	public offsetCenterX: number;
	public offsetCenterY: number;
}
