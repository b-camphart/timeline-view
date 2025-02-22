import type { TimelineItemSource } from "src/timeline/item/TimelineItem.svelte";
import { PlotAreaItem } from "src/timeline/layout/stage/item";
import type { ScaledItem } from "src/timeline/layout/stage/layout";
import { ValuePerPixelScale } from "src/timeline/scale";

export function viewport(styles: Partial<{ padding: { top: number } }> = {}) {
	return {
		padding: padding(styles.padding),
	};
}

export function padding(padding: Partial<{ top: number }> = {}) {
	return {
		top: padding.top ?? 0,
	};
}

export function itemStyles(
	styles: Partial<{ size: number; margin: ReturnType<typeof margin> }> = {}
) {
	return {
		width: styles.size ?? 0,
		margin: margin(styles.margin),
	};
}

export function margin(
	margin: Partial<{
		top: number;
		right: number;
		bottom: number;
		left: number;
	}> = {}
) {
	return {
		top: margin.top ?? 0,
		right: margin.right ?? 0,
		bottom: margin.bottom ?? 0,
		left: margin.left ?? 0,
	};
}

export function scale(valuePerPixel: number = 1) {
	return new ValuePerPixelScale(valuePerPixel);
}

export function layoutItem(
	item: Partial<{ valuePx: number; lengthPx: number }> = {}
): ScaledItem {
	return {
		valuePx: item.valuePx ?? 0,
		lengthPx: item.lengthPx ?? 0,
		layout(top, left, bottom, right, minSize, width, height) {},
	};
}

export function plotAreaItem(
	params: Partial<{
		value: number;
		length: number;
		id: string;
		name: string;
		color: string | undefined;
	}> = {}
) {
	const id = params.id ?? Math.random().toString(36).slice(2);
	const name = params.name ?? `Item ${id}`;
	const source: TimelineItemSource = {
		id: params.id ?? Math.random().toString(36).slice(2),
		name: () => name,
		color: () => params.color,
	};

	return PlotAreaItem.from({
		source,
		id: source.id,
		name: () => source.name(),
		color: () => source.color(),

		startValue: () => params.value ?? 0,
		length: () => params.length ?? 0,
	});
}
