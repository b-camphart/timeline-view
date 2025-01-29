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

	get centerX() {
		return this.left + this.radius;
	}
	set centerX(value: number) {
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

	if (previousLayout.length > sortedItems.length) {
		previousLayout = previousLayout.slice(0, sortedItems.length);
	}

	let topColumnItem: null | LayoutItem = null;
	for (let i = 0; i < sortedItems.length; i++) {
		const item = sortedItems[i];
		const absolutePixelCenter = scale.toPixels(item.value());
		const relativePixelCenter = absolutePixelCenter;
		const relativeLeftMargin = relativePixelCenter - pointRadius - point.margin.horizontal;

		let top = viewport.padding.top + point.margin.vertical;
		const layoutItem = previousLayout[i] ?? new LayoutItem(item);
		layoutItem.item = item;

		if (i > 0) {
			if (topColumnItem!.right >= relativeLeftMargin) {
				top = previousLayout[i - 1].bottom + point.margin.vertical;
			} else {
				topColumnItem = layoutItem;
			}
		} else {
			topColumnItem = layoutItem;
		}

		layoutItem.width = scale.toPixels(item.length()) + point.width;
		layoutItem.height = point.width;
		layoutItem.radius = point.width / 2;

		layoutItem.centerX = relativePixelCenter;
		layoutItem.centerY = top + pointRadius;

		previousLayout[i] = layoutItem;
	}

	return previousLayout;
}
