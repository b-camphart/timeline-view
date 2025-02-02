import {LayoutItem, layoutPoints} from "src/timeline/layout/stage/layout";
import {item, itemStyles, scale, viewport} from "src/timeline/layout/stage/layout.fixtures";
import {bench} from "vitest";

const items = Array(10000)
	.fill(0)
	.map(() => item({value: Math.random() * 10000, length: Math.random() * 1000}));
bench("laying out 10,000 items", () => {
	layoutPoints(viewport(), itemStyles({size: 20}), scale(1), items, item => new LayoutItem(item));
});
