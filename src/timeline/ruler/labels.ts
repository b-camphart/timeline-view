import type { Scale } from "src/timeline/scale";

export const enum DisplayType {
	Numeric,
	Date,
}

export function step(
	type: DisplayType,
	minLabelSize: number,
	scale: Scale,
	options?: { disallowMultiples?: boolean }
) {
	switch (type) {
		case DisplayType.Numeric:
			return valueStep(minLabelSize, scale, options?.disallowMultiples);
		case DisplayType.Date:
			return durationStep(
				minLabelSize,
				scale,
				options?.disallowMultiples
			);
	}
}

/**
 * @param minLabelSize the smallest size, in pixels, that a label can be
 * @param scale the current timeline scale
 */
export function valueStep(
	minLabelSize: number,
	scale: Scale,
	disallowMultiples: boolean = false
) {
	const minStepValue = scale.toValue(minLabelSize);

	const orderOfMagnitude = Math.floor(Math.log10(minStepValue));
	const magnitudeBase = Math.pow(10, orderOfMagnitude);
	if (magnitudeBase >= minStepValue) {
		return magnitudeBase;
	}
	if (disallowMultiples) {
		return magnitudeBase * 10;
	}

	let multiple = magnitudeBase * 2.5;
	// check if whole number since we're multiplying by 2.5
	if (multiple >= minStepValue && Math.trunc(multiple) === multiple) {
		return multiple;
	}
	multiple = magnitudeBase * 5;
	if (multiple >= minStepValue) {
		return multiple;
	}
	// 10 * magnitudeBase MUST be larger than minStepValue, otherwise orderOfMagnitude would have been larger
	return magnitudeBase * 10;
}

const Millisecond = 1;
const Second = 1000 * Millisecond;
const Minute = 60 * Second;
const Hour = 60 * Minute;
const Day = 24 * Hour;
const Week = 7 * Day;
/** the smallest possible month duration */
const Month = 28 * Day;
/** the smallest possible year duration */
const Year = 365 * Day;
export function durationStep(
	minLabelSize: number,
	scale: Scale,
	disallowMultiples: boolean = false
) {
	const minStepValue = scale.toValue(minLabelSize);

	if (Second >= minStepValue) {
		// use multiples of milliseconds
		return valueStep(minLabelSize, scale);
	} else if (Minute >= minStepValue) {
		// maybe use multiples of seconds, or use minutes
		if (Second >= minStepValue) return Second;
		if (disallowMultiples) return Minute;
		if (2 * Second >= minStepValue) return 2 * Second;
		if (5 * Second >= minStepValue) return 5 * Second;
		if (10 * Second >= minStepValue) return 10 * Second;
		if (30 * Second >= minStepValue) return 30 * Second;
		return Minute;
	} else if (Hour >= minStepValue) {
		// maybe use multiples of minutes, or use hours
		if (Minute >= minStepValue) return Minute;
		if (disallowMultiples) return Hour;
		if (2 * Minute >= minStepValue) return 2 * Minute;
		if (5 * Minute >= minStepValue) return 5 * Minute;
		if (10 * Minute >= minStepValue) return 10 * Minute;
		if (30 * Minute >= minStepValue) return 30 * Minute;
		return Hour;
	} else if (Day >= minStepValue) {
		if (Hour >= minStepValue) return Hour;
		if (disallowMultiples) return Day;
		// maybe use multiples of hours, or use days
		if (2 * Hour >= minStepValue) return 2 * Hour;
		if (3 * Hour >= minStepValue) return 3 * Hour;
		if (6 * Hour >= minStepValue) return 6 * Hour;
		if (12 * Hour >= minStepValue) return 12 * Hour;
		return Day;
	} else if (Week >= minStepValue || Month >= minStepValue) {
		if (!disallowMultiples) {
			if (2 * Day >= minStepValue) return 2 * Day;
			if (3 * Day >= minStepValue) return 3 * Day;
			if (4 * Day >= minStepValue) return 4 * Day;
			if (Week >= minStepValue) return Week;
		}
		if (disallowMultiples) return Month;
		if (14 * Day >= minStepValue) return 14 * Day;
		return Month;
	} else if (Year >= minStepValue) {
		if (!disallowMultiples) {
			if (3 * Month >= minStepValue) return 3 * Month;
			if (6 * Month >= minStepValue) return 6 * Month;
		}
		return Year;
	}

	// working in multiples of years
	const minYearCount = minStepValue / Year;
	const orderOfMagnitude = Math.floor(Math.log10(minYearCount));
	const magnitudeBase = Math.pow(10, orderOfMagnitude);
	if (magnitudeBase >= minYearCount) {
		return magnitudeBase * Year;
	}
	if (disallowMultiples) {
		return magnitudeBase * 10 * Year;
	}
	let multiple = magnitudeBase * 2;
	if (multiple >= minYearCount) {
		return multiple * Year;
	}
	multiple = magnitudeBase * 2.5;
	// check if whole number since we're multiplying by 2.5
	if (multiple >= minYearCount && Math.trunc(multiple) === multiple) {
		return multiple * Year;
	}
	multiple = magnitudeBase * 5;
	if (multiple >= minYearCount) {
		return multiple * Year;
	}
	return magnitudeBase * 10 * Year;
}

export function firstLabel(
	type: DisplayType,
	step: number,
	valueAtStartEdge: number
) {
	switch (type) {
		case DisplayType.Numeric:
			return firstLabelValue(step, valueAtStartEdge);
		case DisplayType.Date:
			return firstLabelDatetime(step, valueAtStartEdge);
	}
}

export function firstLabelValue(valueStep: number, valueAtStartEdge: number) {
	return Math.floor(valueAtStartEdge / valueStep) * valueStep;
}

export function firstLabelDatetime(
	durationStep: number,
	millisecondsAtStartEdge: number
) {
	const datetimeAtStart = window.moment(millisecondsAtStartEdge);
	if (durationStep < Second) {
		return firstLabelValue(durationStep, millisecondsAtStartEdge);
	}

	if (durationStep < Minute) {
		// working with a multiple of seconds
		const multiple = Math.floor(durationStep / Second);
		const currentSecond = datetimeAtStart.second();

		const lastAlignedSecond = currentSecond - (currentSecond % multiple);

		return datetimeAtStart
			.second(lastAlignedSecond)
			.startOf("second")
			.valueOf();
	}

	if (durationStep < Hour) {
		// working with a multiple of minutes
		const multiple = Math.floor(durationStep / Minute);
		const currentMinute = datetimeAtStart.minute();

		const lastAlignedMinute = currentMinute - (currentMinute % multiple);

		return datetimeAtStart
			.minute(lastAlignedMinute)
			.startOf("minute")
			.valueOf();
	}

	if (durationStep < Day) {
		// working with a multiple of hours
		const multiple = Math.floor(durationStep / Hour);
		const currentHour = datetimeAtStart.hour();

		const lastAlignedHour = currentHour - (currentHour % multiple);

		return datetimeAtStart.hour(lastAlignedHour).startOf("hour").valueOf();
	}

	// these are all the durations that have fixed durations
	if (durationStep < Month) {
		// working with a multiple of days
		const multiple = Math.floor(durationStep / Day);
		const startOfMonth = datetimeAtStart.startOf("month");

		let firstLabel = startOfMonth;
		let nextJump = firstLabel.clone().add(multiple, "day");
		while (nextJump.valueOf() < millisecondsAtStartEdge) {
			firstLabel = nextJump;
			nextJump = firstLabel.clone().add(multiple, "day");
		}
		return firstLabel.valueOf();
	}

	if (durationStep < Year) {
		// working with a multiple of months
		const multiple = Math.floor(durationStep / Month);
		const currentMonth = datetimeAtStart.month(); // Jan=0, Dec=11

		const lastAlignedMonth = currentMonth - (currentMonth % multiple);

		return datetimeAtStart
			.month(lastAlignedMonth)
			.startOf("month")
			.valueOf();
	}
	// working with years
	const multiple = Math.floor(durationStep / Year);

	const currentYear = datetimeAtStart.year();
	const lastAlignedYear = currentYear - (currentYear % multiple);

	return datetimeAtStart.year(lastAlignedYear).startOf("year").valueOf();
}

export function nextLabel(
	type: DisplayType,
	previousLabel: number,
	step: number
) {
	switch (type) {
		case DisplayType.Numeric:
			return nextLabelValue(previousLabel, step);
		case DisplayType.Date:
			return nextLabelDatetime(previousLabel, step);
	}
}

export function generateLabels(
	type: DisplayType,
	step: number,
	valueAtStartEdge: number,
	valueAtEndEdge: number
) {
	switch (type) {
		case DisplayType.Numeric: {
			let labelValue = firstLabelValue(step, valueAtStartEdge);
			const labelValues = [labelValue];
			do {
				labelValues.push(labelValue);
				labelValue = nextLabelValue(labelValue, step);
			} while (labelValue < valueAtEndEdge);
			return labelValues;
		}
		case DisplayType.Date: {
			let labelDatetime = firstLabelDatetime(step, valueAtStartEdge);
			const labelDatetimes = [labelDatetime];
			do {
				labelDatetimes.push(labelDatetime);
				labelDatetime = nextLabelDatetime(labelDatetime, step);
			} while (labelDatetime < valueAtEndEdge);
			return labelDatetimes;
		}
	}
}

export function nextLabelValue(prevLabelValue: number, step: number) {
	return prevLabelValue + step;
}

export function nextLabelDatetime(prevLabelDatetime: number, duration: number) {
	if (duration <= Day) {
		return prevLabelDatetime + duration;
	}

	if (duration < Month) {
		const multiple = Math.floor(duration / Day);
		const prevDatetime = window.moment(prevLabelDatetime);
		const datetime = prevDatetime.add(multiple, "day");

		// if the next increment would put us over the month, we should just jump to the next month
		if (
			datetime.clone().add(multiple, "day").month() !==
			prevDatetime.month()
		) {
			return datetime.add(1, "month").startOf("month").valueOf();
		}

		return datetime.valueOf();
	}

	if (duration < Year) {
		const multiple = Math.floor(duration / Month);
		const prevDatetime = window.moment(prevLabelDatetime);
		return prevDatetime.add(multiple, "month").valueOf();
	}

	const multiple = Math.floor(duration / Year);
	const prevDatetime = window.moment(prevLabelDatetime);
	return prevDatetime.add(multiple, "year").valueOf();
}

export function formatLabel(type: DisplayType, step: number, value: number) {
	switch (type) {
		case DisplayType.Numeric:
			return formatValue(value);
		case DisplayType.Date:
			return formatDatetime(value, step);
	}
}

export function formatValue(value: number) {
	return value.toLocaleString();
}

export function formatDatetime(ms: number, durationStep: number) {
	const datetime = new Date(ms);
	if (durationStep < Second) {
		return window.moment(ms).format("MMM D, YYYY h:mm:ss.SSS a");
	}
	if (durationStep < Minute) {
		return window.moment(ms).format("MMM D, YYYY h:mm:ss a");
	}
	if (durationStep < Hour) {
		return window.moment(ms).format("MMM D, YYYY h:mm a");
	}
	if (durationStep < Day) {
		return window.moment(ms).format("MMM D, YYYY h a");
	}
	if (durationStep < Month) {
		return window.moment(ms).format("MMM D, YYYY");
	} else if (durationStep < Year) {
		return window.moment(ms).format("MMM YYYY");
	} else {
		return datetime.getFullYear().toLocaleString();
	}
}

export function formatValueLength(length: number) {
	return length.toLocaleString();
}

export function formatDuration(duration: number, step: number) {
	const asDate = new Date(duration);
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
	if (months > 0 && (step < Year || !largestUnitFound)) {
		largestUnitFound = true;
		durationString += `${months}M `;
	}
	if (days > 0 && (step <= Day || !largestUnitFound)) {
		largestUnitFound = true;
		durationString += `${days}d `;
	}
	if (hours > 0 && (step <= Day || !largestUnitFound)) {
		largestUnitFound = true;
		durationString += `${hours}h `;
	}
	if (minutes > 0 && (step <= Day || !largestUnitFound)) {
		largestUnitFound = true;
		durationString += `${minutes}m `;
	}
	if (seconds > 0 && (step <= Day || !largestUnitFound)) {
		largestUnitFound = true;
		durationString += `${seconds}s `;
	}
	if (milliseconds > 0 && (step <= Second || !largestUnitFound)) {
		durationString += `${milliseconds}ms`;
	}

	return durationString.trim();
}
