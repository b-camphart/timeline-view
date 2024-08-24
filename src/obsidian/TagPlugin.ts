import type * as obsidian from "obsidian";

export interface TagView extends obsidian.View {
	/** possibly undefined because the obsidian hidden interface may change */
	tagDoms?: Record<`#${string}`, {selfEl: HTMLElement}>;
}

export function isTagView(view: obsidian.View): view is TagView {
	return view.getViewType() === "tag";
}
