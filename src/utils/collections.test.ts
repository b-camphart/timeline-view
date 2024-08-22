import {MutableSortedArray} from "src/utils/collections";
import {describe, it} from "vitest";

if ("app" in globalThis) {
	throw new Error("Cannot run unit tests in obsidian");
}

describe("SortedArray", () => {
	for (let i = 0; i < 10; i++) {
		it("adds items in order", () => {
			const items = Array<{value: number}>(10);
			for (let i = 0; i < 10; i++) {
				items[i] = {value: i};
			}
			for (let i = 9; i >= 0; i--) {
				const j = Math.floor(Math.random() * 10);
				const temp = items[j];
				items[j] = items[i];
				items[i] = temp;
			}

			const sorted = new MutableSortedArray<{value: number}>(
				it => it.value,
			);

			for (const item of items) {
				sorted.add(item);
			}

			if (sorted.items.length !== 10) {
				throw new Error("Unexpected length");
			}

			const failures = [] as string[];
			for (let i = 0; i < 10; i++) {
				if (sorted.items[i].value !== i) {
					failures.push(
						`expected item at ${i} to be ${i}, but found ${sorted.items[i].value}`,
					);
				}
			}

			if (failures.length > 0) {
				throw new Error(failures.join("\n"));
			}
		});
	}
});
