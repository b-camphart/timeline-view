import { get, type Readable, type Updater, type Writable } from "svelte/store";

export type ZoomConstraints = {
    keepValue: number;
    at: number;
    within: number;
}

export interface TimelineNavigation {

    zoomIn(constraints?: ZoomConstraints): void;
    zoomOut(constraints?: ZoomConstraints): void;
    zoomToFit(): void;
    scrollToFirst(): void;
    scrollToValue(value: number): void;

}

class TimelineNavigationSvelteImpl implements TimelineNavigation {

    private valuePerPixel: number;

    constructor(
        private valuePerPixelProperty: Vetoable<number>,
        private items: Readable<Iterable<number>>,
        private setFocalValue: Writable<number>["update"],
        private availableWidth: () => number
    ) {
        this.valuePerPixel = 1;
        valuePerPixelProperty.subscribe((newValue) => {
            this.valuePerPixel = newValue;
        })
    }

    zoomIn(constraints?: ZoomConstraints) {
		let orderOfMagnitude = Math.floor(Math.log10(this.valuePerPixel));
		const scaleBase = Math.pow(10, orderOfMagnitude);
		let multiple = Math.floor(this.valuePerPixel / scaleBase);

		multiple -= 1;
		if (multiple === 0) {
			multiple = 9;
			orderOfMagnitude -= 1;
		}

		const newScale = this.valuePerPixelProperty.set(
			multiple * Math.pow(10, orderOfMagnitude)
		);
		if (constraints != null) {
			const { keepValue, at } = constraints;
            this.setFocalValue(() => keepValue - at * newScale);
		}
	}

	zoomOut(constraints?: ZoomConstraints) {
		let orderOfMagnitude = Math.floor(Math.log10(this.valuePerPixel));
		const scaleBase = Math.pow(10, orderOfMagnitude);
		let multiple = Math.floor(this.valuePerPixel / scaleBase);

		multiple += 1;
		if (multiple === 10) {
			multiple = 1;
			orderOfMagnitude += 1;
		}

		const newScale = this.valuePerPixelProperty.set(
			multiple * Math.pow(10, orderOfMagnitude)
		);
		if (constraints != null) {
			const { keepValue, at } = constraints;
            this.setFocalValue(() => keepValue - at * newScale);
		}
	}

	zoomToFit() {
        const values = get(this.items)
		const minimum = this.minimumValue(values);
		const maximum = this.maximumValue(values);

		const span = maximum - minimum;
		if (span === 0) {
			this.valuePerPixelProperty.set(1);
            this.setFocalValue(() => minimum);
			return;
		}

		this.valuePerPixelProperty.set(span / this.availableWidth());
		const centerValue = this.centerValue(values);
        this.setFocalValue(() => centerValue)
	};

	scrollToFirst() {
		const minimum = this.minimumValue(get(this.items));
		this.scrollToValue(minimum);
	}

	scrollToValue(value: number) {
        this.setFocalValue(() => value)
	}

    private minimumValue(values: Iterable<number>) {
        let minimumValue: number | undefined;
        for (const item of values) {
            if (minimumValue === undefined || item < minimumValue) {
                minimumValue = item
            }
        }
        if (minimumValue === undefined) {
            minimumValue = 0;
        }
        return minimumValue;
    }

    private maximumValue(values: Iterable<number>) {
        let maximumValue: number | undefined;
        for (const item of values) {
            if (maximumValue === undefined || item > maximumValue) {
                maximumValue = item
            }
        }
        if (maximumValue === undefined) {
            maximumValue = 0;
        }
        return maximumValue;
    }

    private centerValue(values: Iterable<number>) {
        const minimumValue = this.minimumValue(values);
        const maximumValue = this.maximumValue(values);
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
    valuePerPixel: Vetoable<number>,
    items: Readable<Iterable<number>>,
    focalValue: Writable<number>["update"],
    availableWidth: () => number
): TimelineNavigation {
    return new TimelineNavigationSvelteImpl(valuePerPixel, items, focalValue, availableWidth);
}