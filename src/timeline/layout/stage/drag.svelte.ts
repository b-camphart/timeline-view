import type {BackgroundColor} from "src/timeline/layout/stage/CanvasStage";
import type {PlotAreaItem} from "src/timeline/layout/stage/item";
export class DragPreviewElement {
	constructor(
		readonly element: PlotAreaItem,
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

		this.offsetWidth = element.offsetWidth;
		this.offsetRight = element.offsetRight;
		this.offsetLeft = element.offsetLeft;
	}

	value = $state(0);
	length = $state(0);
	endValue = $state(0);
	offsetCenterX = $state(0);
	offsetWidth = $state(0);
	offsetRight = $state(0);
	offsetLeft = $state(0);

	get item() {
		return this.element.item;
	}

	get offsetCenterY() {
		return this.offsetTop + this.element.offsetHeight / 2;
	}

	get offsetTop() {
		return this.element.offsetTop;
	}

	get offsetBottom() {
		return this.offsetTop + this.element.offsetHeight;
	}
	get offsetHeight() {
		return this.element.offsetHeight;
	}
}
