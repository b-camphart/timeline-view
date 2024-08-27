import type * as obsidian from "obsidian";

export interface TagView extends obsidian.View {
	/** possibly undefined because the obsidian hidden interface may change */
	tagDoms?: Record<`#${string}`, {selfEl: HTMLElement}>;
}

export function tagDomRecordInTagView(
	view: Pick<obsidian.View, "getViewType">,
) {
	if (view.getViewType() !== "tag") return undefined;
	const tagDoms = (view as TagView).tagDoms;
	if (tagDoms == null) return undefined;
	if (typeof tagDoms !== "object") return undefined;

	for (const value of Object.values(tagDoms)) {
		if (typeof value !== "object") return undefined;
		if (!("selfEl" in value) || typeof value.selfEl !== "object")
			return undefined;
		if (!(value.selfEl instanceof HTMLElement)) return undefined;
	}

	return tagDoms;
}

const tagChars = new Set(
	"#-_/1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
);
export function findSurroundingTagInLine(line: string, pos: number) {
	let tagStart = pos;
	for (tagStart; tagStart >= 0; tagStart--) {
		if (!tagChars.has(line[tagStart])) {
			tagStart++;
			break;
		}
		if (tagStart === 0) break;
	}
	let tagEnd = pos;
	for (tagEnd; tagEnd < line.length; tagEnd++) {
		if (!tagChars.has(line[tagEnd])) {
			break;
		}
	}
	const tag = line.slice(tagStart, tagEnd);
	if (!tag.startsWith("#")) return null;
	return tag;
}
