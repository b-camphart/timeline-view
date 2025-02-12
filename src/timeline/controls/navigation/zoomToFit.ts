import { ValuePerPixelScale } from "src/timeline/scale";

export interface FitBounds {
	readonly size: number;
	readonly padding: {
		readonly start: number;
		readonly end: number;
	};
	readonly items: {
		readonly size: number;
		readonly margin: {
			readonly start: number;
			readonly end: number;
		};
	};
}

export function zoomToFit(
	items: Iterable<{ value(): number; length(): number }>,
	within: FitBounds,
): [scale: ValuePerPixelScale, centerValue: number] {
	const minimum = minValue(items);
	const maximum = maxValue(items);

	const span = maximum - minimum;
	const startOffset =
		within.padding.start +
		within.items.margin.start +
		within.items.size / 2;
	const endOffset =
		within.padding.end + within.items.margin.end + within.items.size / 2;
	const fitSize = within.size - startOffset - endOffset;
	const offsetDiff = endOffset - startOffset;

	const scale =
		span === 0
			? new ValuePerPixelScale(1)
			: new ValuePerPixelScale(span / fitSize);
	const midValue = span === 0 ? minimum : minimum + span / 2;

	const offset = scale.toValue(offsetDiff / 2);

	return [scale, midValue + offset];
}

function minValue(items: Iterable<{ value(): number }>) {
	let minimumValue = Number.POSITIVE_INFINITY;
	for (const item of items) {
		const itemValue = item.value();
		if (itemValue < minimumValue) {
			minimumValue = itemValue;
		}
	}
	if (minimumValue === Number.POSITIVE_INFINITY) {
		return 0;
	}
	return minimumValue;
}

function maxValue(items: Iterable<{ value(): number; length(): number }>) {
	let maximumValue = Number.NEGATIVE_INFINITY;
	for (const item of items) {
		let endValue = item.value() + item.length();
		if (endValue > maximumValue) {
			maximumValue = endValue;
		}
	}
	if (maximumValue === Number.NEGATIVE_INFINITY) {
		return 0;
	}
	return maximumValue;
}
