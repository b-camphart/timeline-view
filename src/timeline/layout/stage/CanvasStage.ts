import type { TimelineItem } from "../../Timeline";
import { TimelineLayoutItem, type OffsetBox } from "./TimelineItemElement";

// export function* renderStage(
// 	this: CanvasRenderingContext2D,
// 	viewport: {
// 		width: number;
// 		height: number;
// 		centerValue: number;
// 		scrollTop: number;
// 	},
// 	point: {
// 		width: number;
// 		marginX: number;
// 		marginY: number;
// 	},
// 	scale: {
// 		toPixels(value: number): number;
// 		toValue(pixels: number): number;
// 	},
// 	sortedItems: TimelineItem[],
// ) {
// 	const pointRadius = point.width / 2;
// 	const PI2 = 2 * Math.PI;

// 	const defaultColor = this.fillStyle;

// 	this.beginPath();
// 	this.clearRect(0, 0, viewport.width, viewport.height);

// 	const pointBounds = Array.from(layoutPoints(point, scale, sortedItems));
// 	let maxY = 0;
// 	for (const bounds of pointBounds) {
// 		if (bounds.bottom > maxY) maxY = bounds.bottom;
// 	}

// 	const maxScroll = Math.max(0, maxY + point.marginY - viewport.height);
// 	if (viewport.scrollTop > maxScroll) viewport.scrollTop = maxScroll;

// 	let currentColor = this.fillStyle;

// 	for (const bounds of pointBounds) {
// 		const scrolledY = bounds.centerY - viewport.scrollTop;

// 		const color = bounds.item.color() ?? defaultColor;

// 		if (color !== currentColor) {
// 			this.closePath();
// 			this.fill();
// 			this.beginPath();
// 		}

// 		this.fillStyle = color;

// 		this.moveTo(bounds.right, scrolledY);
// 		this.arc(bounds.centerX, scrolledY, pointRadius, 0, PI2);

// 		yield new PointBounds(bounds.centerX, scrolledY, bounds.item, point);
// 	}
// 	this.closePath();
// 	this.fill();
// }

export function renderLayout(
	context: CanvasRenderingContext2D,
	viewport: {
		height: number;
		width: number;
	},
	point: {
		width: number;
	},
	layout: readonly (OffsetBox & { backgroundColor?: string })[],
) {
	const pointRadius = point.width / 2;
	const PI2 = 2 * Math.PI;
	const renderHeight = viewport.height + point.width;

	const defaultColor = context.fillStyle;

	context.beginPath();
	context.clearRect(0, 0, viewport.width, viewport.height);

	let currentColor = context.fillStyle;

	for (const item of layout) {
		if (item.offsetTop > renderHeight || item.offsetBottom < 0) continue;

		const color = item.backgroundColor ?? defaultColor;

		if (color !== currentColor) {
			context.closePath();
			context.fill();
			context.beginPath();
		}

		context.fillStyle = color;

		context.moveTo(item.offsetRight, item.offsetTop);
		context.arc(
			item.offsetCenterX,
			item.offsetCenterY,
			pointRadius,
			0,
			PI2,
		);
	}
	context.closePath();
	context.fill();
}

export function layoutPoints(
	point: {
		width: number;
		margin: {
			horizontal: number;
			vertical: number;
		};
	},
	scale: {
		toPixels(value: number): number;
		toValue(pixels: number): number;
	},
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
			row * (point.width + point.margin.vertical) +
			pointRadius +
			point.margin.horizontal;
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

export class PointBounds {
	constructor(
		public centerX: number,
		public centerY: number,
		public readonly item: TimelineItem,
		private readonly point: { readonly width: number },
	) {}

	get x() {
		return this.centerX - this.point.width / 2;
	}
	get y() {
		return this.centerY - this.point.width / 2;
	}
	get left() {
		return this.x;
	}
	get right() {
		return this.centerX + this.point.width / 2;
	}
	get top() {
		return this.y;
	}
	get bottom() {
		return this.centerY + this.point.width / 2;
	}

	contains(x: number, y: number) {
		return this.x <= x && x < this.right && this.y <= y && y < this.bottom;
	}
}
