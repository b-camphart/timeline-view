import {layoutPoints} from "src/timeline/layout/stage/layout";
import {ValuePerPixelScale} from "src/timeline/scale";
import type {TimelineItem} from "src/timeline/Timeline";
import {inspect} from "util";
import {describe} from "vitest";

function viewport(styles: Partial<{padding: {top: number}}> = {}) {
	return {
		padding: padding(styles.padding),
	};
}

function padding(padding: Partial<{top: number}> = {}) {
	return {
		top: padding.top ?? 0,
	};
}

function itemStyles(styles: Partial<{size: number; margin: {horizontal: number; vertical: number}}> = {}) {
	return {
		width: styles.size ?? 0,
		margin: margin(styles.margin),
	};
}

function margin(margin: Partial<{horizontal: number; vertical: number}> = {}) {
	return {
		horizontal: margin.horizontal ?? 0,
		vertical: margin.vertical ?? 0,
	};
}

function scale(valuePerPixel: number = 1) {
	return new ValuePerPixelScale(valuePerPixel);
}

function item(
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

describe("laying out items", it => {
	it("places items horizontally based on scale and their value", t => {
		const items = [item({value: 10}), item({value: 20}), item({value: 30})];

		for (let s of [scale(1), scale(2), scale(0.5)]) {
			const positioned = layoutPoints(viewport(), itemStyles({size: 16}), s, items);
			t.expect(
				positioned.map(it => ({
					left: it.left,
					centerX: it.centerX,
					right: it.right,
				})),
				inspect(s),
			).toEqual([
				{left: s.toPixels(10) - 8, centerX: s.toPixels(10), right: s.toPixels(10) + 8},
				{left: s.toPixels(20) - 8, centerX: s.toPixels(20), right: s.toPixels(20) + 8},
				{left: s.toPixels(30) - 8, centerX: s.toPixels(30), right: s.toPixels(30) + 8},
			]);
		}
	});

	it("prevents items from overlapping", t => {
		const items = [item({value: 10}), item({value: 20}), item({value: 30}), item({value: 31})];

		const s = scale(1);
		const positioned = layoutPoints(viewport(), itemStyles({size: 20}), s, items);

		t.expect(
			positioned.map(it => ({
				top: it.top,
				centerY: it.centerY,
				bottom: it.bottom,
			})),
		).toEqual([
			{top: 0, centerY: 10, bottom: 20},
			{top: 20, centerY: 30, bottom: 40},
			{top: 40, centerY: 50, bottom: 60},
			{top: 0, centerY: 10, bottom: 20},
		]);
	});

	it("prevents items from overlapping, accounting for margin", t => {
		const items = [item({value: 10}), item({value: 25}), item({value: 40}), item({value: 41})];

		const s = scale(1);
		const positioned = layoutPoints(
			viewport(),
			itemStyles({size: 20, margin: margin({vertical: 5, horizontal: 10})}),
			s,
			items,
		);

		t.expect(
			positioned.map(it => ({
				top: it.top,
				centerY: it.centerY,
				bottom: it.bottom,
			})),
		).toEqual([
			// first item is pushed down by vertical margin
			{top: 5, centerY: 15, bottom: 25},
			{top: 30, centerY: 40, bottom: 50},
			{top: 55, centerY: 65, bottom: 75},
			{top: 5, centerY: 15, bottom: 25},
		]);
	});

	it("pushes the items down by the top padding", t => {
		const items = [item({value: 10}), item({value: 20}), item({value: 30}), item({value: 31})];

		const s = scale(1);
		const positioned = layoutPoints(viewport({padding: padding({top: 5})}), itemStyles({size: 20}), s, items);

		t.expect(positioned.map(it => it.top)).toEqual([5, 25, 45, 5]);
	});

	it("calculates the width of the item based on its length", t => {
		for (let s of [scale(1), scale(2), scale(0.5)]) {
			const positioned = layoutPoints(viewport(), itemStyles({size: 20}), s, [item({value: 10, length: 10})]);

			t.expect(positioned[0].width).toEqual(s.toPixels(10) + 20);
		}
	});

	it("prevents items from overlapping, accounting for item width", t => {
		const positioned = layoutPoints(viewport(), itemStyles({size: 20}), scale(1), [
			item({value: 10, length: 20}),
			item({value: 31}),
			item({value: 52}),
		]);

		t.expect(positioned.map(it => ({left: it.left, top: it.top, right: it.right}))).toEqual([
			{left: 0, top: 0, right: 40},
			{left: 21, top: 20, right: 41},
			{left: 42, top: 0, right: 62},
		]);
	});

	it("fills in the top rows as densly as possible", t => {
		const positioned = layoutPoints(viewport(), itemStyles({size: 20}), scale(1), [
			item({value: 0, length: 10}),
			item({value: 0, length: 20}),
			item({value: 31}),
		]);

		t.expect(positioned.find(it => it.item.value() === 0 && it.item.length() === 10)!.top).toEqual(0);
		t.expect(positioned.find(it => it.item.value() === 0 && it.item.length() === 20)!.top).toEqual(20);
		t.expect(positioned.find(it => it.item.value() === 31)!.top).toEqual(0);
	});

	it("prevents overlap by skipping rows that are blocked", t => {
		const positioned = layoutPoints(viewport(), itemStyles({size: 20}), scale(1), [
			item({value: 0, length: 10}),
			item({value: 0, length: 20}),
			item({value: 31}),
			item({value: 31, length: 1}), // length just to differentiate
		]);

		/*
		 0          31
		 v          v
		(..........)()
		(.....................)
	                ()
		 ^          ^
		 0          31
		*/

		t.expect(positioned.find(it => it.item.value() === 0 && it.item.length() === 10)!.top).toEqual(0);
		t.expect(positioned.find(it => it.item.value() === 0 && it.item.length() === 20)!.top).toEqual(20);
		t.expect(positioned.find(it => it.item.value() === 31 && it.item.length() === 0)!.top).toEqual(0);
		t.expect(positioned.find(it => it.item.value() === 31 && it.item.length() === 1)!.top).toEqual(40);
	});
});
