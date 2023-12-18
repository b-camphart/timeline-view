
export type Unsubscribe = () => void;
export type Subscription<T> = (newValue: T, unsubscribe: Unsubscribe) => void;

export interface TimelineUserInput {
    zoomIn(): void;
    zoomOut(): void;
    zoomToFit(): void;
    scrollToFirst(): void;
    scrollToZero(): void;
    scrollToValue(value: number): void;
    selectItem(item: TimelineItem): void;
}

export interface TimelineItem {
    id(): string;
    value(): number;
    name(): string
}

export interface TimelineDisplayItem extends TimelineItem {
    positionX(): number;
    positionY(): number;

    shiftedLeftBy(amount: number): TimelineDisplayItem;
}

export function timelineDisplayItem(item: TimelineItem, x: number, y: number): TimelineDisplayItem {
    return new DisplayItem(item, x, y)
}

class DisplayItem implements TimelineDisplayItem {
    constructor(
        private item: TimelineItem,
        private x: number,
        private y: number,
    ){}

    id(): string {
        return this.item.id();
    }

    value() { 
        return this.item.value()
    }

    name() {
        return this.item.name()
    }

    positionX(): number {
        return this.x
    }

    positionY(): number {
        return this.y;
    }

    shiftedLeftBy(amount: number): TimelineDisplayItem {
        return new ShiftedDisplayItem(this, amount);
    }

}

class ShiftedDisplayItem implements TimelineDisplayItem {
    constructor(
        private original: DisplayItem,
        private shiftedBy: number,
    ){}

    id(): string {
        return this.original.id();
    }

    value() { 
        return this.original.value()
    }

    name() {
        return this.original.name()
    }

    positionX(): number {
        return this.original.positionX() + this.shiftedBy;
    }

    positionY(): number {
        return this.original.positionY();
    }

    shiftedLeftBy(amount: number): TimelineDisplayItem {
        return timelineDisplayItem(this.original, this.original.positionX() + amount, this.original.positionY());
    }

}

export function layoutPoints(
    items: TimelineItem[],
    valuePerPixel: number,
    pointRadius: number,
    marginBetweenPoints: number,
): TimelineDisplayItem[] {
    if (Number.isNaN(valuePerPixel)) {
        valuePerPixel = 1;
    }
    const pointDiameter = pointRadius * 2;
    const displayItems = [];
    const lastXByRow = [];
    for (const item of items) {
        const x = item.value() / valuePerPixel;

        let y = -1;
        for (let row = 0; row < lastXByRow.length; row++) {
            if (x - lastXByRow[row] >= marginBetweenPoints) {
                lastXByRow[row] = x + pointDiameter;
                y = row * (pointDiameter + marginBetweenPoints);
                break;
            }
        }
        if (y === -1) {
            y = lastXByRow.length * (pointDiameter + marginBetweenPoints);
            lastXByRow.push(x + pointDiameter);
        }

        displayItems.push(new DisplayItem(item, x, y));
    }

    return displayItems;
}

export function displayDateValue(value: number, scale: number): string {
    const date = new Date(value);
    const dateString = date.toLocaleDateString();
    if (scale < (24 * 60 * 60 * 1000)) {
        if (scale < 1000) {
            return dateString + " " + date.toLocaleTimeString() + " " + date.getMilliseconds() + "ms";
        }
        return dateString + " " + date.toLocaleTimeString();
    }
    return dateString
}

export interface ValueDisplay {

    displayValue(value: number): string;

}

export interface RulerValueDisplay extends ValueDisplay {

    getSmallestLabelStepValue(valuePerPixel: number): number;
    labels(labelCount: number, labelStepValue: number, firstLabelValue: number): { text: string, value: number }[]

}

class DateValueDisplay implements RulerValueDisplay {

    private labelStepValue: number;

    constructor() {
        this.labelStepValue = 1001;
    }

    displayValue(value: number) {
        return displayDateValue(value, this.labelStepValue)
    }

    getSmallestLabelStepValue(valuePerPixel: number): number {
        const factors = {
            1000: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000],
            12: [1, 2, 3, 4, 6, 12],
            24: [1, 2, 3, 4, 6, 12, 24],
            60: [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60],
            365: [1, 2, 73, 365]
        } as const;

        const units = {
            "millisecond": 1000,
            "second": 60,
            "minute": 60,
            "hour": 24,
            "day": 365,
            "year": 1000,
        } as const

        const unitMultiples = {
            "millisecond": 1,
            "second": 1000,
            "minute": 60 * 1000,
            "hour": 60 * 60 * 1000,
            "day": 24 * 60 * 60 * 1000,
            "year": 365 * 24 * 60 * 60 * 1000
        } as const;

        const minStepWidths = {
            "millisecond": 256,
            "second": 160,
            "minute": 160,
            "hour": 160,
            "day": 128,
            "year": 128,
        } as const;

        outer: for (const [unit, maximum] of Object.entries(units)) {
            const unitFactors = factors[maximum];
            const unitMultiple = unitMultiples[unit as keyof typeof units];
            const minStepWidth = minStepWidths[unit as keyof typeof units];
            const minStepValue = minStepWidth * valuePerPixel;
            for (const factor of unitFactors) {
                const total = unitMultiple * factor;
                if (total >= minStepValue) {
                    this.labelStepValue = total;
                    break outer;
                }
            }
        }

        // we're dealing with crazy scales above 1000 year time jumps.
        this.labelStepValue = getSmallestMultipleOf10Above(128 * valuePerPixel)
        return this.labelStepValue
    }

    labels(labelCount: number, labelStepValue: number, firstLabelValue: number): { text: string; value: number; }[] {
        if (labelCount < 1 || Number.isNaN(labelCount)) {
            labelCount = 1
        }
        const values = new Array(Math.ceil(labelCount)).fill(0).map((_, i) => firstLabelValue + (i * labelStepValue))
        return values.map(value => ({ text: this.displayValue(value), value }));
    }
}

export function timelineDateValueDisplay(): RulerValueDisplay {
    return new DateValueDisplay();
}

const numericValueDisplay: RulerValueDisplay = {
    labels(labelCount, labelStepValue, firstLabelValue) {
		if (labelCount < 1 || Number.isNaN(labelCount)) {
			labelCount = 1
		}
		const values = new Array(Math.ceil(labelCount)).fill(0).map((_, i) => firstLabelValue + (i * labelStepValue))
        return values.map(value => ({ text: this.displayValue(value), value }))
    },
    getSmallestLabelStepValue(valuePerPixel) {
        const minStepWidth = 64;
        const minStepValue = minStepWidth * valuePerPixel;
        return getSmallestMultipleOf10Above(minStepValue);
    },
    displayValue(value) {
        return value.toLocaleString();
    },
}

function getSmallestMultipleOf10Above(minStepValue: number) {
    const log = Math.floor(Math.log10(minStepValue));
    const orderOfMagnitude = Math.pow(10, log);
    const options = [1, 2.5, 5, 10].map((it) => it * orderOfMagnitude);
    return options.find(
        (it) => Math.floor(it) === it && it > minStepValue
    )!;
}

export function timelineNumericValueDisplay(): RulerValueDisplay {
    return numericValueDisplay;
}

class MappedIterable<T, R> implements Iterable<R> {

    constructor(private base: Iterable<T>, private transform: (item: T, index: number) => R) {}

    [Symbol.iterator]() {
        const self = this
        return function* () {
            let index = 0;
            for (const value of self.base) {
                yield self.transform(value, index)
                index++;
            }
        }.call(null)
    }
}

export function* map<T, R>(iterable: Iterable<T>, transform: (value: T, index: number) => R): Iterable<R> {
    return new MappedIterable(iterable, transform)
}

