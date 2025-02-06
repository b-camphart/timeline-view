import {ValuePerPixelScale} from "src/timeline/scale";

export function zoomToFit(
	items: Iterable<{readonly value: number; readonly length: number}>,
	width: number,
): [scale: ValuePerPixelScale, centerValue: number] {
	const minimum = minValue(items);
	const maximum = maxValue(items);

	const span = maximum - minimum;

	if (span === 0) {
		return [new ValuePerPixelScale(1), minimum];
	}

	return [new ValuePerPixelScale(span / width), minimum + span / 2];
}

function minValue(items: Iterable<{readonly value: number}>) {
	let minimumValue = Number.POSITIVE_INFINITY;
	for (const item of items) {
		if (item.value < minimumValue) {
			minimumValue = item.value;
		}
	}
	if (minimumValue === Number.POSITIVE_INFINITY) {
		return 0;
	}
	return minimumValue;
}

function maxValue(items: Iterable<{readonly value: number; readonly length: number}>) {
	let maximumValue = Number.NEGATIVE_INFINITY;
	for (const item of items) {
		let endValue = item.value + item.length;
		if (endValue > maximumValue) {
			maximumValue = endValue;
		}
	}
	if (maximumValue === Number.NEGATIVE_INFINITY) {
		return 0;
	}
	return maximumValue;
}
