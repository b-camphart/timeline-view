import {TimelineLayoutItem} from "src/timeline/layout/stage/TimelineItemElement";
import type {Scale} from "src/timeline/scale";
import type {TimelineItem} from "src/timeline/Timeline";

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

	let prev: {relativeLeftMargin: number; row: number; value: number} | undefined;

	if (previousLayout.length > sortedItems.length) {
		previousLayout = previousLayout.slice(0, sortedItems.length);
	}

	for (let i = 0; i < sortedItems.length; i++) {
		const item = sortedItems[i];
		const absolutePixelCenter = scale.toPixels(item.value());
		const relativePixelCenter = absolutePixelCenter;
		const relativeLeftMargin = relativePixelCenter - pointRadius - point.margin.horizontal;

		let row: number;
		if (relativeLeftMargin === prev?.relativeLeftMargin) {
			row = findNextAvailableRow(relativeLeftMargin, lastXByRow, prev.row);
		} else {
			row = findNextAvailableRow(relativeLeftMargin, lastXByRow);
		}

		const layoutItem = previousLayout[i] ?? new TimelineLayoutItem(item);
		layoutItem.item = item;
		layoutItem.centerX = relativePixelCenter;
		layoutItem.centerY =
			viewport.padding.top + point.margin.vertical + pointRadius + row * (point.width + point.margin.vertical);
		layoutItem.width = scale.toPixels(item.length()) + point.width;
		layoutItem.height = point.width;
		layoutItem.radius = point.width / 2;

		lastXByRow[row] = layoutItem.centerX + layoutItem.radius;

		prev = {relativeLeftMargin, row, value: item.value()};

		previousLayout[i] = layoutItem;
	}

	return previousLayout;
}

function findNextAvailableRow(relativeLeftMargin: number, lastXByRow: number[], startIndex: number = 0) {
	for (let rowIndex = startIndex; rowIndex < lastXByRow.length; rowIndex++) {
		const x = lastXByRow[rowIndex];
		if (x < relativeLeftMargin) {
			return rowIndex;
		}
	}

	return lastXByRow.length;
}
