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

	readonly visible?: boolean;
	readonly backgroundColor: BackgroundColor | undefined;
	readonly borderColor: BackgroundColor | undefined;
	readonly strokeWidth: number | undefined;
}

export interface CanvasElementCollection extends Iterable<CanvasElement> {
	getCount(): number;
}

function renderItems(
	context: CanvasRenderingContext2D,
	viewport: CanvasViewport,
	items: CanvasElementCollection,
) {
	const PI2 = 2 * Math.PI;

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

		if (
			color !== currentFillColor ||
			borderColor !== currentBorderColor ||
			strokeWidth !== currentStrokeWidth
		) {
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
		context.arc(
			item.offsetCenterX,
			item.offsetCenterY,
			item.offsetWidth / 2,
			0,
			PI2,
		);
	}
	context.closePath();
	context.fill();
	if (currentStrokeWidth > 0) {
		context.stroke();
	}
}

export function layoutPoints(
	viewport: {
		padding: {
			top: number;
		};
	},
	point: {
		width: number;
		margin: {
			horizontal: number;
			vertical: number;
		};
	},
	scale: Scale,
	sortedItems: readonly TimelineItem[],
	previousLayout: TimelineLayoutItem[] = [],
) {
	const pointRadius = Math.floor(point.width / 2);

	const lastXByRow: number[] = [];

	let prev:
		| {relativeLeftMargin: number; row: number; value: number}
		| undefined;

	if (previousLayout.length > sortedItems.length) {
		previousLayout = previousLayout.slice(0, sortedItems.length);
	}

	for (let i = 0; i < sortedItems.length; i++) {
		const item = sortedItems[i];
		const absolutePixelCenter = scale.toPixels(item.value());
		const relativePixelCenter = absolutePixelCenter;
		const relativeLeftMargin =
			relativePixelCenter - pointRadius - point.margin.horizontal;

		let row: number;
		if (relativeLeftMargin === prev?.relativeLeftMargin) {
			row = findNextAvailableRow(
				relativeLeftMargin,
				lastXByRow,
				prev.row,
			);
		} else {
			row = findNextAvailableRow(relativeLeftMargin, lastXByRow);
		}

		const layoutItem = previousLayout[i] ?? new TimelineLayoutItem(item);
		layoutItem.item = item;
		layoutItem.centerX = relativePixelCenter;
		layoutItem.centerY =
			viewport.padding.top +
			point.margin.vertical +
			pointRadius +
			row * (point.width + point.margin.vertical);
		layoutItem.radius = point.width / 2;

		lastXByRow[row] = layoutItem.centerX + layoutItem.radius;

		prev = {relativeLeftMargin, row, value: item.value()};

		previousLayout[i] = layoutItem;
	}

	return previousLayout;
}

function findNextAvailableRow(
	relativeLeftMargin: number,
	lastXByRow: number[],
	startIndex: number = 0,
) {
	for (let rowIndex = startIndex; rowIndex < lastXByRow.length; rowIndex++) {
		const x = lastXByRow[rowIndex];
		if (x < relativeLeftMargin) {
			return rowIndex;
		}
	}

	return lastXByRow.length;
}
