import type { TimelineItem } from "src/timeline/Timeline";

export interface OffsetBox {
	readonly offsetTop: number;
	readonly offsetLeft: number;
	readonly offsetWidth: number;
	readonly offsetHeight: number;
}

export interface ExtendedOffsetBox extends OffsetBox {
	readonly offsetBottom: number;
	readonly offsetRight: number;
	readonly offsetCenterX: number;
	readonly offsetCenterY: number;
}

export function offsetBottom(box: OffsetBox) {
	return box.offsetTop + box.offsetHeight;
}

export function offsetRight(box: OffsetBox) {
	return box.offsetLeft + box.offsetWidth;
}

export function offsetCenterX(box: OffsetBox) {
	return box.offsetLeft + box.offsetWidth / 2;
}

export function offsetCenterY(box: OffsetBox) {
	return box.offsetTop + box.offsetHeight / 2;
}

export function boxContainsPoint(box: OffsetBox, x: number, y: number) {
	return (
		box.offsetLeft <= x &&
		x < offsetRight(box) &&
		box.offsetTop <= y &&
		y < offsetBottom(box)
	);
}

export class TimelineLayoutItem {
	constructor(
		public item: TimelineItem,
		public centerX: number = 0,
		public centerY: number = 0,
		public width: number = 0,
		public height: number = 0,
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

export class TimelineItemElementStyle {
	constructor(
		public fill: string,
		public stroke: string,
		public strokeWidth: number,
	) {}

	static fromCSS(css: CSSStyleDeclaration) {
		return new TimelineItemElementStyle(
			css.backgroundColor,
			css.borderColor,
			parseFloat(css.borderWidth),
		);
	}

	static readonly unstyled = new TimelineItemElementStyle("", "", 0);

	equals(other: unknown) {
		if (!(other instanceof TimelineItemElementStyle)) {
			return false;
		}

		return (
			other.fill === this.fill &&
			other.stroke === this.stroke &&
			other.strokeWidth === this.strokeWidth
		);
	}
}
