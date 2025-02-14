import type { Scale } from "src/timeline/scale";

export interface Scalable {
	scale(scale: Scale): void;
}

export function scaleItems(scale: Scale, items: readonly Scalable[]) {
	items.forEach((it) => it.scale(scale));
}

export interface ScaledItem {
	readonly valuePx: number;
	readonly lengthPx: number;

	layout(
		top: number,
		left: number,
		bottom: number,
		right: number,
		minSize: number,
		width: number,
		height: number,
	): void;
}

export function layoutItems(
	minSize: number,
	margin: {
		readonly top: number;
		readonly bottom: number;
		readonly left: number;
		readonly right: number;
	},
	scaledItems: readonly ScaledItem[],
) {
	const vMargin = Math.max(margin.top, margin.bottom);
	const hMargin = Math.max(margin.left, margin.right);
	const halfMinSize = minSize / 2;

	const rowHeight = minSize + vMargin;
	let rows: number[] = [];
	for (let i = 0; i < scaledItems.length; i++) {
		const scaled = scaledItems[i];

		const left = scaled.valuePx - halfMinSize;
		const right = left + scaled.lengthPx + minSize;

		const relativeLeftMargin = left - hMargin;
		let r = 0;
		while (r < rows.length && rows[r] >= relativeLeftMargin) {
			r++;
		}

		const top = margin.top + r * rowHeight;
		const bottom = top + minSize;
		rows[r] = right;

		scaled.layout(
			top,
			left,
			bottom,
			right,
			minSize,
			right - left,
			bottom - top,
		);
	}
}
