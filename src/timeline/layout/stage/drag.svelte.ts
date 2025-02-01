import type {BackgroundColor} from "src/timeline/layout/stage/CanvasStage";
import type {TimelineItemElement} from "src/timeline/layout/stage/TimelineItemElement";

export class DragPreviewElement {
	constructor(
		private element: TimelineItemElement,
		value: number,
		length: number,
		endValue: number,
		offsetCenterX: number,
		public readonly backgroundColor: BackgroundColor | undefined,
		public readonly borderColor: BackgroundColor | undefined,
		public readonly strokeWidth: number | undefined,
	) {
		this.value = value;
		this.length = length;
		this.endValue = endValue;
		this.offsetCenterX = offsetCenterX;
	}

	value = $state(0);
	length = $state(0);
	endValue = $state(0);
	offsetCenterX = $state(0);

	get item() {
		return this.element.layoutItem.item;
	}

	get offsetCenterY() {
		return this.offsetTop + this.element.offsetHeight / 2;
	}
	get offsetLeft() {
		return this.offsetCenterX - this.element.offsetHeight / 2;
	}

	get offsetTop() {
		return this.element.offsetTop;
	}

	get offsetRight() {
		return this.offsetCenterX + this.element.offsetWidth;
	}

	get offsetBottom() {
		return this.offsetTop + this.element.offsetHeight;
	}
	get offsetWidth() {
		return this.element.offsetWidth;
	}
	get offsetHeight() {
		return this.element.offsetHeight;
	}
}
