import type {Scale} from "src/timeline/scale";
import type {TimelineItem} from "src/timeline/Timeline";

export class LayoutItem {
	constructor(public item: TimelineItem) {}

	top: number = 0;
	left: number = 0;
	bottom: number = 0;
	right: number = 0;
	radius: number = 0;

	layout(top: number, left: number, bottom: number, right: number, radius: number) {
		this.top = top;
		this.left = left;
		this.bottom = bottom;
		this.right = right;
		this.radius = radius;
	}
}

export function layoutPoints<T extends LayoutItem>(
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
	makeLayoutItem: (item: TimelineItem) => T,
	previousLayout: T[] = [],
) {
	const pointRadius = Math.floor(point.width / 2);

	if (previousLayout.length !== sortedItems.length) {
		previousLayout.length = sortedItems.length;
	}

	const startCenterY = viewport.padding.top + point.margin.vertical + pointRadius;

	const rowHeight = point.margin.vertical + point.width;
	let rows: number[] = [];
	for (let i = 0; i < sortedItems.length; i++) {
		const item = sortedItems[i];
		const absolutePixelCenter = scale.toPixels(item.value());

		const width = scale.toPixels(item.length()) + point.width;
		const height = point.width;
		const radius = pointRadius;

		const left = absolutePixelCenter - radius;
		const right = left + width;

		const relativeLeftMargin = left - point.margin.horizontal;
		let r = 0;
		while (r < rows.length && rows[r] >= relativeLeftMargin) {
			r++;
		}

		const centerY = startCenterY + r * rowHeight;
		const top = centerY - radius;
		const bottom = top + height;
		rows[r] = right;

		const layoutItem = previousLayout[i] ?? makeLayoutItem(item);
		layoutItem.item = item;
		layoutItem.layout(top, left, bottom, right, radius);
		previousLayout[i] = layoutItem;
	}

	return previousLayout;
}
