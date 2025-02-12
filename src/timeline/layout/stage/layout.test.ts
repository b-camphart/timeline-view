import {
	layoutItems as layoutPoints,
	scaleItems,
	type ScaledItem,
} from "src/timeline/layout/stage/layout";
import {
	margin,
	scale,
	plotAreaItem,
} from "src/timeline/layout/stage/layout.fixtures";
import type { LayoutItem } from "src/timeline/layout/stage/scroll";
import { describe } from "vitest";

describe("scaling items", (it) => {
	it("scales items based on the scale", (t) => {
		const value = Math.random() * 100 - 50;
		const item = plotAreaItem({ value });
		for (let s of [scale(1), scale(2), scale(0.5)]) {
			scaleItems(s, [item]);

			t.expect(item.valuePx).toEqual(s.toPixels(value));
		}
	});

	it("calculates the width of the item based on its length", (t) => {
		const length = Math.random() * 100;
		const item = plotAreaItem({ length });
		for (let s of [scale(1), scale(2), scale(0.5)]) {
			scaleItems(s, [item]);
			t.expect(item.lengthPx).toEqual(s.toPixels(length));
		}
	});
});

describe("laying out items", (it) => {
	function scaledItem(
		params: Partial<{ valuePx: number; lengthPx: number }> = {},
	): ScaledItem & LayoutItem {
		const item = plotAreaItem();
		item.valuePx = params.valuePx ?? 0;
		item.lengthPx = params.lengthPx ?? 0;
		return item;
	}

	it("calculates the horizontal offsets based on the minWidth and positioning", (t) => {
		const items = [
			scaledItem({ valuePx: 10 }),
			scaledItem({ valuePx: 20, lengthPx: 10 }),
			scaledItem({ valuePx: 30 }),
		];

		layoutPoints(16, margin(), items);

		t.expect(items[0].layoutLeft).toEqual(10 - 8);
		t.expect(items[0].layoutRight).toEqual(10 + 8);

		t.expect(items[1].layoutLeft).toEqual(20 - 8);
		t.expect(items[1].layoutRight).toEqual(20 + 8 + 10);

		t.expect(items[2].layoutLeft).toEqual(30 - 8);
		t.expect(items[2].layoutRight).toEqual(30 + 8);
	});

	it("prevents items from overlapping", (t) => {
		const items = [
			scaledItem({ valuePx: 10 }),
			scaledItem({ valuePx: 20 }),
			scaledItem({ valuePx: 30 }),
			scaledItem({ valuePx: 31 }),
		];

		layoutPoints(20, margin(), items);

		t.expect(
			items.map((it) => ({
				top: it.layoutTop,
				centerY: (it.layoutTop + it.layoutBottom) / 2,
				bottom: it.layoutBottom,
			})),
		).toEqual([
			{ top: 0, centerY: 10, bottom: 20 },
			{ top: 20, centerY: 30, bottom: 40 },
			{ top: 40, centerY: 50, bottom: 60 },
			{ top: 0, centerY: 10, bottom: 20 },
		]);
	});

	it("prevents items from overlapping, accounting for margin", (t) => {
		const items = [
			scaledItem({ valuePx: 10 }),
			scaledItem({ valuePx: 25 }),
			scaledItem({ valuePx: 40 }),
			scaledItem({ valuePx: 41 }),
		];

		layoutPoints(
			20,
			margin({ top: 5, left: 10, right: 10, bottom: 5 }),
			items,
		);

		t.expect(
			items.map((it) => ({
				top: it.layoutTop,
				centerY: (it.layoutTop + it.layoutBottom) / 2,
				bottom: it.layoutBottom,
			})),
		).toEqual([
			// first item is pushed down by vertical margin
			{ top: 5, centerY: 15, bottom: 25 },
			{ top: 30, centerY: 40, bottom: 50 },
			{ top: 55, centerY: 65, bottom: 75 },
			{ top: 5, centerY: 15, bottom: 25 },
		]);
	});

	// it("pushes the items down by the top padding", (t) => {
	// 	const items = [
	// 		layoutItem({ valuePx: 10 }),
	// 		layoutItem({ valuePx: 20 }),
	// 		layoutItem({ valuePx: 30 }),
	// 		layoutItem({ valuePx: 31 }),
	// 	];

	// 	 layoutPoints(
	// 		10,
	// 		viewport({ padding: padding({ top: 5 }) }),
	// 		itemStyles({ size: 20 }),
	// 		s,
	// 		items,
	// 		makeLayoutItem,
	// 	);

	// 	t.expect(positioned.map((it) => it.top)).toEqual([5, 25, 45, 5]);
	// });

	it("prevents items from overlapping, accounting for item width", (t) => {
		const items = [
			scaledItem({ valuePx: 10, lengthPx: 20 }),
			scaledItem({ valuePx: 31 }),
			scaledItem({ valuePx: 52 }),
		];
		layoutPoints(20, margin(), items);

		t.expect(
			items.map((it) => ({
				left: it.layoutLeft,
				top: it.layoutTop,
				right: it.layoutRight,
			})),
		).toEqual([
			{ left: 0, top: 0, right: 40 },
			{ left: 21, top: 20, right: 41 },
			{ left: 42, top: 0, right: 62 },
		]);
	});

	it("fills in the top rows as densly as possible", (t) => {
		const items = [
			scaledItem({ valuePx: 0, lengthPx: 10 }),
			scaledItem({ valuePx: 0, lengthPx: 20 }),
			scaledItem({ valuePx: 31 }), // fits in either row
		];
		layoutPoints(20, margin(), items);

		t.expect(
			items.find((it) => it.valuePx === 0 && it.lengthPx === 10)!
				.layoutTop,
		).toEqual(0);
		t.expect(
			items.find((it) => it.valuePx === 0 && it.lengthPx === 20)!
				.layoutTop,
		).toEqual(20);
		t.expect(items.find((it) => it.valuePx === 31)!.layoutTop).toEqual(0);
	});

	it("prevents overlap by skipping rows that are blocked", (t) => {
		const items = [
			scaledItem({ valuePx: 0, lengthPx: 10 }),
			scaledItem({ valuePx: 0, lengthPx: 20 }),
			scaledItem({ valuePx: 31 }),
			scaledItem({ valuePx: 31, lengthPx: 1 }), // length just to differentiate
		];
		layoutPoints(20, margin(), items);

		/*
		 0          31
		 v          v
		(..........)()
		(.....................)
	                ()
		 ^          ^
		 0          31
		*/

		t.expect(
			items.find((it) => it.valuePx === 0 && it.lengthPx === 10)!
				.layoutTop,
		).toEqual(0);
		t.expect(
			items.find((it) => it.valuePx === 0 && it.lengthPx === 20)!
				.layoutTop,
		).toEqual(20);
		t.expect(
			items.find((it) => it.valuePx === 31 && it.lengthPx === 0)!
				.layoutTop,
		).toEqual(0);
		t.expect(
			items.find((it) => it.valuePx === 31 && it.lengthPx === 1)!
				.layoutTop,
		).toEqual(40);
	});
});
