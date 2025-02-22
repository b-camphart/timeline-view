import { layoutItems, scaleItems } from "src/timeline/layout/stage/layout";
import {
	scale,
	margin,
	plotAreaItem,
} from "src/timeline/layout/stage/layout.fixtures";
import { bench } from "vitest";

const items = Array(10000)
	.fill(0)
	.map(() =>
		plotAreaItem({
			value: Math.random() * 10000,
			length: Math.random() * 1000,
		}),
	);
bench("laying out 10,000 items", () => {
	scaleItems(scale(1), items);
	layoutItems(20, margin(), items);
});
