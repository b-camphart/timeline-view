import type {LayoutItem} from "src/timeline/layout/stage/layout";
import type {TimelineItem} from "src/timeline/Timeline";

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
	return box.offsetLeft <= x && x < offsetRight(box) && box.offsetTop <= y && y < offsetBottom(box);
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
	public fill;
	public stroke;
	public strokeWidth;

	constructor(css: CSSStyleDeclaration) {
		this.fill = css.backgroundColor;
		this.stroke = css.borderColor;
		this.strokeWidth = parseFloat(css.borderWidth);
	}

	equals(other: unknown) {
		if (!(other instanceof TimelineItemElementStyle)) {
			return false;
		}

		return other.fill === this.fill && other.stroke === this.stroke && other.strokeWidth === this.strokeWidth;
	}
}

export class TimelineItemElement {
	constructor(
		layoutItem: LayoutItem,
		public offsetLeft: number = 0,
		public offsetRight: number = 0,
		public offsetTop: number = 0,
		public offsetWidth: number = 0,
		public offsetHeight: number = 0,
		public offsetBottom: number = 0,
		public offsetCenterX: number = 0,
		public offsetCenterY: number = 0,
	) {
		this.#layoutItem = layoutItem;
	}

	contains(x: number, y: number) {
		return this.offsetLeft <= x && x < this.offsetRight && this.offsetTop <= y && y < this.offsetBottom;
	}

	intersects(x: number, y: number, width: number, height: number) {
		return (
			((x >= this.offsetLeft && x < this.offsetRight) || (this.offsetLeft >= x && this.offsetLeft < x + width)) &&
			((y >= this.offsetTop && y < this.offsetBottom) || (this.offsetTop >= y && this.offsetTop < y + height))
		);
	}

	#style: TimelineItemElementStyle | undefined = undefined;

	set style(style: TimelineItemElementStyle) {
		this.#style = style;
	}

	#layoutItem;
	get layoutItem() {
		return this.#layoutItem;
	}

	set layoutItem(item: LayoutItem) {
		this.#layoutItem = item;
		this.visible = undefined;
	}

	visible: boolean | undefined;

	get backgroundColor(): string | CanvasGradient | CanvasPattern | undefined {
		return this.layoutItem.item.color() ?? this.#style?.fill;
	}

	get borderColor() {
		return this.#style?.stroke;
	}

	get strokeWidth() {
		return this.#style?.strokeWidth;
	}
}
