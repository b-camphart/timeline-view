import type {Scale} from "src/timeline/scale";
import type {TimelineItem} from "../../Timeline";
import {TimelineLayoutItem} from "./TimelineItemElement";

export type BackgroundColor = string | CanvasGradient | CanvasPattern;

export function renderLayout(
	context: CanvasRenderingContext2D,
	viewport: CanvasViewport,
	layout: CanvasElementCollection,
	dragPreview: CanvasElementCollection | null,
) {
	context.beginPath();
	context.clearRect(0, 0, viewport.width, viewport.height);

	renderItems(context, viewport, layout);
	if (dragPreview != null && dragPreview.getCount() > 0) {
		renderItems(context, viewport, dragPreview);
	}
}

export interface CanvasViewport {
	readonly width: number;
	readonly height: number;
}

export interface CanvasElement {
	readonly offsetTop: number;
	readonly offsetBottom: number;
	readonly offsetLeft: number;
	readonly offsetRight: number;
	readonly offsetCenterY: number;
	readonly offsetCenterX: number;
	readonly offsetWidth: number;
	readonly offsetHeight: number;

	readonly visible?: boolean;
	readonly backgroundColor: BackgroundColor | undefined;
	readonly borderColor: BackgroundColor | undefined;
	readonly strokeWidth: number | undefined;
}

export interface CanvasElementCollection extends Iterable<CanvasElement> {
	getCount(): number;
}

function renderItems(context: CanvasRenderingContext2D, viewport: CanvasViewport, items: CanvasElementCollection) {
	const defaultColor = context.fillStyle;
	const defaultBorderColor = context.strokeStyle;
	const defaultStrokeWidth = 0;

	let currentBorderColor = defaultBorderColor;
	let currentFillColor = defaultColor;
	let currentStrokeWidth = 2;

	context.beginPath();

	for (const item of items) {
		if (item.visible === false) continue;
		if (item.offsetTop > viewport.height || item.offsetBottom < 0) continue;
		if (item.offsetLeft > viewport.width || item.offsetRight < 0) continue;

		const color = item.backgroundColor ?? defaultColor;
		const borderColor = item.borderColor ?? defaultBorderColor;
		const strokeWidth = item.strokeWidth ?? defaultStrokeWidth;

		if (color !== currentFillColor || borderColor !== currentBorderColor || strokeWidth !== currentStrokeWidth) {
			context.fill();
			if (currentStrokeWidth > 0) {
				context.stroke();
			}
			context.beginPath();

			context.fillStyle = color;
			currentFillColor = color;

			context.strokeStyle = borderColor;
			currentBorderColor = borderColor;

			context.lineWidth = strokeWidth;
			currentStrokeWidth = strokeWidth;
		}

		context.moveTo(item.offsetRight, item.offsetCenterY);
		context.roundRect(item.offsetLeft, item.offsetTop, item.offsetWidth, item.offsetHeight, item.offsetHeight / 2);
	}
	context.closePath();
	context.fill();
	if (currentStrokeWidth > 0) {
		context.stroke();
	}
}

export {
	/** @deprecated import from "./layout" */
	layoutPoints,
} from "./layout";
