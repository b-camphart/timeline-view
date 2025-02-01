import type {Scale} from "src/timeline/scale";
import type {TimelineItem} from "src/timeline/Timeline";

class LayoutItem {
	constructor(
		public item: TimelineItem,
		public left: number = 0,
		public top: number = 0,
		public width: number = 0,
		public height: number = 0,
		public radius: number = 0,
	) {
		this.right = left + width;
		this.bottom = top + height;
	}

	right;
	bottom;

	/** the absolute x position represented by the value of the item */
	get valueX() {
		return this.left + this.radius;
	}
	set valueX(value: number) {
		this.left = value - this.radius;
		this.right = this.left + this.width;
	}

	get centerY() {
		return this.top + this.radius;
	}
	set centerY(value: number) {
		this.top = value - this.radius;
		this.bottom = this.top + this.height;
	}
}
export {type LayoutItem};

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
	previousLayout: LayoutItem[] = [],
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

		const layoutItem = previousLayout[i] ?? new LayoutItem(item);
		layoutItem.item = item;
		layoutItem.width = scale.toPixels(item.length()) + point.width;
		layoutItem.height = point.width;
		layoutItem.radius = pointRadius;

		layoutItem.valueX = absolutePixelCenter;
		layoutItem.centerY = startCenterY;

		const relativeLeftMargin = layoutItem.left - point.margin.horizontal;
		let r = 0;
		while (r < rows.length && rows[r] >= relativeLeftMargin) {
			r++;
		}

		layoutItem.centerY = startCenterY + r * rowHeight;
		rows[r] = layoutItem.right;

		previousLayout[i] = layoutItem;
	}

	return previousLayout;
}
