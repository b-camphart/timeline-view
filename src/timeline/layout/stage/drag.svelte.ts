import type {BackgroundColor, CanvasElement} from "src/timeline/layout/stage/CanvasStage";
export class DragPreviewElement<T> implements CanvasElement {
	get visible() {
		return true;
	}
	constructor(
		readonly base: T & {
			readonly offsetWidth: number;
			readonly offsetRight: number;
			readonly offsetLeft: number;
			readonly offsetHeight: number;
			readonly offsetTop: number;
			readonly offsetBottom: number;
		},
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

		this.offsetWidth = base.offsetWidth;
		this.offsetRight = base.offsetRight;
		this.offsetLeft = base.offsetLeft;
	}

	value = $state(0);
	length = $state(0);
	endValue = $state(0);
	offsetCenterX = $state(0);
	offsetWidth = $state(0);
	offsetRight = $state(0);
	offsetLeft = $state(0);

	get offsetTop() {
		return this.base.offsetTop;
	}

	get offsetBottom() {
		return this.offsetTop + this.base.offsetHeight;
	}
	get offsetHeight() {
		return this.base.offsetHeight;
	}
}
