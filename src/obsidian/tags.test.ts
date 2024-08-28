import {describe, expect, test} from "vitest";
import * as tags from "src/obsidian/tags";

describe("findSurroundingTagInLine", () => {
	describe("degenerate cases", () => {
		test("empty line", () => {
			expect(tags.findSurroundingTagInLine("", 0)).toBeNull();
		});
		test("no hash", () => {
			expect(tags.findSurroundingTagInLine("a", 0)).toBeNull();
		});
		test("characters next to hash", () => {
			expect(tags.findSurroundingTagInLine("b#a", 2)).toBeNull();
		});
	});
	test("tag at start of line", () => {
		expect(tags.findSurroundingTagInLine("#a", 1)).toBe("#a");
	});
	test("tag at end of line", () => {
		expect(tags.findSurroundingTagInLine("blah blah blah #tag", 17)).toBe(
			"#tag",
		);
	});
	test("tag in middle of line", () => {
		expect(tags.findSurroundingTagInLine("blah #tag blah", 7)).toBe("#tag");
	});
});
