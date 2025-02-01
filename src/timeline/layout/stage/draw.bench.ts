import type {CanvasElement} from "src/timeline/layout/stage/CanvasStage";
import {batchRenderItems, renderItemsSequentially} from "src/timeline/layout/stage/draw";
import {beforeEach, bench, describe, vi, vitest} from "vitest";

const viewport = {width: 800, height: 600};

describe("drawing 10,000 items", () => {
	let items: CanvasElement[] = Array(10000)
		.fill(0)
		.map((_, i) => ({
			offsetTop: i % 500,
			offsetBottom: (i % 500) + 10,
			offsetLeft: i % 400,
			offsetRight: (i % 400) + 20,
			offsetCenterX: 0,
			offsetCenterY: 0,
			offsetWidth: 20,
			offsetHeight: 10,
			visible: true,
			backgroundColor: i % 2 === 0 ? "red" : "blue",
			borderColor: "black",
			strokeWidth: 1,
		}));

	bench("sequentially", () => {
		renderItemsSequentially(
			{
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 0,
				beginPath: vi.fn(),
				closePath: vi.fn(),
				moveTo: vi.fn(),
				fill: vi.fn(),
				stroke: vi.fn(),
				roundRect: vi.fn(),
			},
			viewport,
			{
				getCount: () => items.length,
				[Symbol.iterator]: () => items[Symbol.iterator](),
			},
		);
	});
	bench("in batches", () => {
		batchRenderItems(
			{
				fillStyle: "",
				strokeStyle: "",
				lineWidth: 0,
				beginPath: vi.fn(),
				closePath: vi.fn(),
				moveTo: vi.fn(),
				fill: vi.fn(),
				stroke: vi.fn(),
				roundRect: vi.fn(),
			},
			viewport,
			{
				getCount: () => items.length,
				[Symbol.iterator]: () => items[Symbol.iterator](),
			},
		);
	});
});
