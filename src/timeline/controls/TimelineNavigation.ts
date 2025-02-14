import { type Readable, type Writable } from "svelte/store";
import { ValuePerPixelScale, type Scale } from "../scale";
import {
	zoomToFit,
	type FitBounds,
} from "src/timeline/controls/navigation/zoomToFit";
import type {
	TimelineItem,
	TimelineItemSource,
} from "src/timeline/item/TimelineItem.svelte";

export type ZoomConstraints = {
	keepValue: number;
	at: number;
	within: number;
};

export interface TimelineNavigation<T extends TimelineItemSource> {
	zoomIn(constraints?: ZoomConstraints): void;
	zoomOut(constraints?: ZoomConstraints): void;
	zoomToFit(items?: Iterable<TimelineItem<T>>, within?: FitBounds): void;
	scrollToFirst(): void;
	scrollToValue(value: number): void;
}

class TimelineNavigationSvelteImpl<T extends TimelineItemSource>
	implements TimelineNavigation<T>
{
	private scale: Scale;

	constructor(
		private scaleProperty: Vetoable<Scale>,
		private items: { get(): Iterable<TimelineItem<T>> },
		private setFocalValue: Writable<number>["update"],
		private fitBounds: () => FitBounds,
	) {
		this.scale = new ValuePerPixelScale(1);
		scaleProperty.subscribe((newValue) => {
			this.scale = newValue;
		});
	}

	zoomIn(constraints?: ZoomConstraints) {
		const valuePerPixel = this.scale.toValue(1);
		let orderOfMagnitude = Math.floor(Math.log10(valuePerPixel));
		const scaleBase = Math.pow(10, orderOfMagnitude);
		let multiple = Math.floor(valuePerPixel / scaleBase);

		multiple -= 1;
		if (multiple === 0) {
			multiple = 9;
			orderOfMagnitude -= 1;
		}

		const newScale = this.scaleProperty.set(
			new ValuePerPixelScale(multiple * Math.pow(10, orderOfMagnitude)),
		);
		if (constraints != null) {
			const { keepValue, at } = constraints;
			this.setFocalValue(() => keepValue - newScale.toValue(at));
		}
	}

	zoomOut(constraints?: ZoomConstraints) {
		const valuePerPixel = this.scale.toValue(1);
		let orderOfMagnitude = Math.floor(Math.log10(valuePerPixel));
		const scaleBase = Math.pow(10, orderOfMagnitude);
		let multiple = Math.floor(valuePerPixel / scaleBase);

		multiple += 1;
		if (multiple === 10) {
			multiple = 1;
			orderOfMagnitude += 1;
		}

		const newScale = this.scaleProperty.set(
			new ValuePerPixelScale(multiple * Math.pow(10, orderOfMagnitude)),
		);
		if (constraints != null) {
			const { keepValue, at } = constraints;
			this.setFocalValue(() => keepValue - newScale.toValue(at));
		}
	}

	zoomToFit(
		items: Iterable<TimelineItem<T>> = this.items.get(),
		within: FitBounds = this.fitBounds(),
	) {
		const [scale, centerValue] = zoomToFit(items, within);
		this.scaleProperty.set(scale);
		this.setFocalValue(() => centerValue);
	}

	scrollToFirst() {
		const minimum = this.minimumValue();
		this.scrollToValue(minimum);
	}

	scrollToValue(value: number) {
		this.setFocalValue(() => value);
	}

	private minimumValue(items = this.items.get()) {
		let minimumValue: number | undefined;
		for (const item of items) {
			const itemValue = item.value();
			if (minimumValue === undefined || itemValue < minimumValue) {
				minimumValue = itemValue;
			}
		}
		if (minimumValue === undefined) {
			minimumValue = 0;
		}
		return minimumValue;
	}

	private maximumValue(items = this.items.get()) {
		let maximumValue: number | undefined;
		for (const item of items) {
			const itemValue = item.value();
			if (maximumValue === undefined || itemValue > maximumValue) {
				maximumValue = itemValue;
			}
		}
		if (maximumValue === undefined) {
			maximumValue = 0;
		}
		return maximumValue;
	}

	private centerValue(items = this.items.get()) {
		const minimumValue = this.minimumValue(items);
		const maximumValue = this.maximumValue(items);
		return (maximumValue - minimumValue) / 2 + minimumValue;
	}
}

export interface Vetoable<T> extends Readable<T> {
	/**
	 * Set value and inform subscribers.
	 * @param value to set
	 * @returns the value that was set.  May NOT be equal to provided value, if vetoed or modified.
	 */
	set(this: void, value: T): T;
}

export function timelineNavigation<T extends TimelineItemSource>(
	scale: Vetoable<Scale>,
	items: { get(): Iterable<TimelineItem<T>> },
	focalValue: Writable<number>["update"],
	fitBounds: () => FitBounds,
): TimelineNavigation<T> {
	return new TimelineNavigationSvelteImpl(
		scale,
		items,
		focalValue,
		fitBounds,
	);
}
