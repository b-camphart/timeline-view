import {ValueFormatter} from "src/timeline/layout/stage/Hover.svelte";
import type {Scale} from "./scale";

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
	length(): number;
	name(): string;

	color(): string | undefined;
}

export interface TimelineDisplayItem extends TimelineItem {
	positionX(): number;
	positionY(): number;

	shiftedLeftBy(amount: number): TimelineDisplayItem;
}

export function timelineDisplayItem(item: TimelineItem, x: number, y: number): TimelineDisplayItem {
	return new DisplayItem(item, x, y);
}

class DisplayItem implements TimelineDisplayItem {
	constructor(private item: TimelineItem, private x: number, private y: number) {}

	id(): string {
		return this.item.id();
	}

	value() {
		return this.item.value();
	}

	length() {
		return this.item.length();
	}

	name() {
		return this.item.name();
	}

	color(): string | undefined {
		return this.item.color();
	}

	positionX(): number {
		return this.x;
	}

	positionY(): number {
		return this.y;
	}

	shiftedLeftBy(amount: number): TimelineDisplayItem {
		return new ShiftedDisplayItem(this, amount);
	}
}

class ShiftedDisplayItem implements TimelineDisplayItem {
	constructor(private original: DisplayItem, private shiftedBy: number) {}

	id(): string {
		return this.original.id();
	}

	value() {
		return this.original.value();
	}

	length(): number {
		return this.original.length();
	}

	name() {
		return this.original.name();
	}

	color() {
		return this.original.color();
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

type Duration = number;

const Millisecond: Duration = 1;
const Second: Duration = Millisecond * 1000;
const Minute: Duration = Second * 60;
const Hour: Duration = Minute * 60;
const Day: Duration = Hour * 24;
const Week: Duration = Day * 7;
const Year: Duration = Day * 365;

export function displayDateValue(value: number, scale: number): string {
	const date = new Date(value);
	let dateString = date.toLocaleDateString();
	if (scale < Day) {
		dateString += " " + date.toLocaleTimeString();
	}
	if (scale < Second) {
		dateString += " " + date.getMilliseconds() + "ms";
	}
	return dateString;
}

function formatDateLength(length: Duration, scale: number): string {
	const asDate = new Date(length);
	let durationString = "";

	const years = asDate.getUTCFullYear() - 1970;
	const months = asDate.getUTCMonth();
	const days = asDate.getUTCDate();
	const hours = asDate.getUTCHours();
	const minutes = asDate.getUTCMinutes();
	const seconds = asDate.getUTCSeconds();
	const milliseconds = asDate.getUTCMilliseconds();

	let largestUnitFound = false;
	if (years > 0) {
		largestUnitFound = true;
		durationString += `${years}y `;
	}
	if (months > 0 && (scale < Year || !largestUnitFound)) {
		largestUnitFound = true;
		durationString += `${months}M `;
	}
	if (days > 0 && (scale <= Day || !largestUnitFound)) {
		largestUnitFound = true;
		durationString += `${days}d `;
	}
	if (hours > 0 && (scale <= Day || !largestUnitFound)) {
		largestUnitFound = true;
		durationString += `${hours}h `;
	}
	if (minutes > 0 && (scale <= Day || !largestUnitFound)) {
		largestUnitFound = true;
		durationString += `${minutes}m `;
	}
	if (seconds > 0 && (scale <= Day || !largestUnitFound)) {
		largestUnitFound = true;
		durationString += `${seconds}s `;
	}
	if (milliseconds > 0 && (scale <= Second || !largestUnitFound)) {
		durationString += `${milliseconds}ms`;
	}

	return durationString.trim();
}

export interface ValueDisplay {
	displayValue(value: number): string;
}

export interface RulerValueDisplay extends ValueDisplay {
	getSmallestLabelStepValue(scale: Scale): number;
	labels(labelCount: number, labelStepValue: number, firstLabelValue: number): {text: string; value: number}[];
	formatter: ValueFormatter;
}

class DateValueDisplay implements RulerValueDisplay {
	private labelStepValue: number;

	constructor() {
		this.labelStepValue = 1001;
	}

	get formatter() {
		return new ValueFormatter(
			value => displayDateValue(value, this.labelStepValue),
			length => formatDateLength(length, this.labelStepValue),
		);
	}

	displayValue(value: number) {
		return displayDateValue(value, this.labelStepValue);
	}

	getSmallestLabelStepValue(scale: Scale): number {
		const factors = {
			1000: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000],
			12: [1, 2, 3, 4, 6, 12],
			24: [1, 2, 3, 4, 6, 12, 24],
			60: [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60],
			365: [1, 2, 73, 365],
		} as const;

		const units = {
			millisecond: 1000,
			second: 60,
			minute: 60,
			hour: 24,
			day: 365,
			year: 1000,
		} as const;

		const unitMultiples = {
			millisecond: 1,
			second: 1000,
			minute: 60 * 1000,
			hour: 60 * 60 * 1000,
			day: 24 * 60 * 60 * 1000,
			year: 365 * 24 * 60 * 60 * 1000,
		} as const;

		const minStepWidths = {
			millisecond: 256,
			second: 160,
			minute: 160,
			hour: 160,
			day: 128,
			year: 128,
		} as const;

		outer: for (const [unit, maximum] of Object.entries(units)) {
			const unitFactors = factors[maximum];
			const unitMultiple = unitMultiples[unit as keyof typeof units];
			const minStepWidth = minStepWidths[unit as keyof typeof units];
			const minStepValue = scale.toValue(minStepWidth);
			for (const factor of unitFactors) {
				const total = unitMultiple * factor;
				if (total >= minStepValue) {
					this.labelStepValue = total;
					break outer;
				}
			}
		}

		// we're dealing with crazy scales above 1000 year time jumps.
		this.labelStepValue = getSmallestMultipleOf10Above(scale.toValue(128));
		return this.labelStepValue;
	}

	labels(labelCount: number, labelStepValue: number, firstLabelValue: number): {text: string; value: number}[] {
		if (labelCount < 1 || Number.isNaN(labelCount)) {
			labelCount = 1;
		}
		const values = new Array(Math.ceil(labelCount)).fill(0).map((_, i) => firstLabelValue + i * labelStepValue);
		return values.map(value => ({text: this.displayValue(value), value}));
	}
}

export function timelineDateValueDisplay(): RulerValueDisplay {
	return new DateValueDisplay();
}

const numericValueDisplay: RulerValueDisplay = {
	formatter: new ValueFormatter(
		value => value.toLocaleString(),
		length => length.toLocaleString(),
	),
	labels(labelCount, labelStepValue, firstLabelValue) {
		if (labelCount < 1 || Number.isNaN(labelCount)) {
			labelCount = 1;
		}
		const values = new Array(Math.ceil(labelCount)).fill(0).map((_, i) => firstLabelValue + i * labelStepValue);
		return values.map(value => ({text: this.displayValue(value), value}));
	},
	getSmallestLabelStepValue(scale) {
		const minStepWidth = 64;
		const minStepValue = scale.toValue(minStepWidth);
		return getSmallestMultipleOf10Above(minStepValue);
	},
	displayValue(value) {
		return value.toLocaleString();
	},
};

function getSmallestMultipleOf10Above(minStepValue: number) {
	const log = Math.floor(Math.log10(minStepValue));
	const orderOfMagnitude = Math.pow(10, log);

	for (const multiple of [1, 2.5, 5]) {
		const option = multiple * orderOfMagnitude;
		if (Math.floor(option) === option && option > minStepValue) {
			return option;
		}
	}

	return orderOfMagnitude * 10;
}

export function timelineNumericValueDisplay(): RulerValueDisplay {
	return numericValueDisplay;
}

class MappedIterable<T, R> implements Iterable<R> {
	constructor(private base: Iterable<T>, private transform: (item: T, index: number) => R) {}

	*[Symbol.iterator]() {
		let index = 0;
		for (const value of this.base) {
			yield this.transform(value, index);
			index++;
		}
	}
}

export function map<T, R>(iterable: Iterable<T>, transform: (value: T, index: number) => R): Iterable<R> {
	return new MappedIterable(iterable, transform);
}
