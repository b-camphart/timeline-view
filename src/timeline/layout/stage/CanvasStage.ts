import type { Scale } from "src/timeline/scale";
import type { TimelineItem } from "../../Timeline";
import { TimelineLayoutItem, type OffsetBox } from "./TimelineItemElement";

export type BackgroundColor = string | CanvasGradient | CanvasPattern;

export function renderLayout(
	context: CanvasRenderingContext2D,
	viewport: {
		height: number;
		width: number;
	},
	point: {
		width: number;
	},
	layout: readonly (OffsetBox & {
		backgroundColor?: BackgroundColor;
		borderColor?: BackgroundColor;
	})[],
	dragPreview: (OffsetBox & { backgroundColor?: BackgroundColor }) | null,
) {
	const pointRadius = point.width / 2;
	const PI2 = 2 * Math.PI;
	const renderHeight = viewport.height + point.width;

	const defaultColor = context.fillStyle;
	const defaultBorderColor = context.strokeStyle;

	context.lineWidth = 2;

	let currentBorderColor = undefined;

	context.beginPath();
	context.clearRect(0, 0, viewport.width, viewport.height);

	for (const item of layout) {
		if (item.offsetTop > renderHeight || item.offsetBottom < 0) continue;

		const color = item.backgroundColor ?? defaultColor;
		const borderColor = item.borderColor;

		if (color !== context.fillStyle || borderColor !== currentBorderColor) {
			context.fill();
			if (currentBorderColor != null) {
				context.stroke();
			}
			context.beginPath();

			context.fillStyle = color;
			currentBorderColor = borderColor;
			context.strokeStyle = borderColor ?? defaultBorderColor;
		}

		context.moveTo(item.offsetRight, item.offsetCenterY);
		context.arc(
			item.offsetCenterX,
			item.offsetCenterY,
			pointRadius,
			0,
			PI2,
		);
	}
	context.fill();
	if (currentBorderColor != null) {
		context.stroke();
	}
	if (dragPreview) {
		context.beginPath();
		context.fillStyle = dragPreview.backgroundColor ?? defaultColor;
		context.moveTo(dragPreview.offsetRight, dragPreview.offsetCenterY);
		context.arc(
			dragPreview.offsetCenterX,
			dragPreview.offsetCenterY,
			pointRadius,
			0,
			PI2,
		);
		context.closePath();
		context.fill();
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
	sortedItems: TimelineItem[],
	previousLayout: TimelineLayoutItem[] = [],
) {
	const pointRadius = Math.floor(point.width / 2);

	const lastXByRow: number[] = [];

	let prev:
		| { relativeLeftMargin: number; row: number; value: number }
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

		prev = { relativeLeftMargin, row, value: item.value() };

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
