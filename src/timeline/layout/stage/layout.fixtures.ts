import {ValuePerPixelScale} from "src/timeline/scale";
import type {TimelineItem} from "src/timeline/Timeline";

export function viewport(styles: Partial<{padding: {top: number}}> = {}) {
	return {
		padding: padding(styles.padding),
	};
}

export function padding(padding: Partial<{top: number}> = {}) {
	return {
		top: padding.top ?? 0,
	};
}

export function itemStyles(styles: Partial<{size: number; margin: {horizontal: number; vertical: number}}> = {}) {
	return {
		width: styles.size ?? 0,
		margin: margin(styles.margin),
	};
}

export function margin(margin: Partial<{horizontal: number; vertical: number}> = {}) {
	return {
		horizontal: margin.horizontal ?? 0,
		vertical: margin.vertical ?? 0,
	};
}

export function scale(valuePerPixel: number = 1) {
	return new ValuePerPixelScale(valuePerPixel);
}

export function item(
	item: Partial<{
		value: number;
		length: number;
	}> = {},
): TimelineItem {
	return {
		value: () => item.value ?? 0,
		id: () => "",
		name: () => "",
		color: () => undefined,
		length: () => item.length ?? 0,
	};
}
