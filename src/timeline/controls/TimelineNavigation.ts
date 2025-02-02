import {type Readable, type Writable} from "svelte/store";
import type {TimelineItem} from "../Timeline";
import {ValuePerPixelScale, type Scale} from "../scale";
import {zoomToFit} from "src/timeline/controls/navigation/zoomToFit";

export type ZoomConstraints = {
	keepValue: number;
	at: number;
	within: number;
};

export interface TimelineNavigation {
	zoomIn(constraints?: ZoomConstraints): void;
	zoomOut(constraints?: ZoomConstraints): void;
	zoomToFit(items?: Iterable<TimelineItem>, width?: number): void;
	scrollToFirst(): void;
	scrollToValue(value: number): void;
}

class TimelineNavigationSvelteImpl implements TimelineNavigation {
	private scale: Scale;

	constructor(
		private scaleProperty: Vetoable<Scale>,
		private items: {get(): Iterable<TimelineItem>},
		private setFocalValue: Writable<number>["update"],
		private availableWidth: () => number,
	) {
		this.scale = new ValuePerPixelScale(1);
		scaleProperty.subscribe(newValue => {
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

		const newScale = this.scaleProperty.set(new ValuePerPixelScale(multiple * Math.pow(10, orderOfMagnitude)));
		if (constraints != null) {
			const {keepValue, at} = constraints;
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

		const newScale = this.scaleProperty.set(new ValuePerPixelScale(multiple * Math.pow(10, orderOfMagnitude)));
		if (constraints != null) {
			const {keepValue, at} = constraints;
			this.setFocalValue(() => keepValue - newScale.toValue(at));
		}
	}

	zoomToFit(items: Iterable<TimelineItem> = this.items.get(), width: number = this.availableWidth()) {
		const [scale, centerValue] = zoomToFit(items, width);
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
			if (minimumValue === undefined || item.value() < minimumValue) {
				minimumValue = item.value();
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
			if (maximumValue === undefined || item.value() > maximumValue) {
				maximumValue = item.value();
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

export function timelineNavigation(
	scale: Vetoable<Scale>,
	items: {get(): Iterable<TimelineItem>},
	focalValue: Writable<number>["update"],
	availableWidth: () => number,
): TimelineNavigation {
	return new TimelineNavigationSvelteImpl(scale, items, focalValue, availableWidth);
}
