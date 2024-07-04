import type { TFile } from "obsidian";
import type { Note } from "src/note";
import type { NoteFilter } from "src/note/filter";

export interface ItemGroup {
	id: string;
	query: string;
	readonly filter: NoteFilter;
	color: string;
}

export interface ColorSelector {
	selectColor(note: Note): Promise<string | undefined>;
}

export function getColorSelector(groups: ItemGroup[]): ColorSelector {
	return {
		async selectColor(note) {
			let color: string | undefined;
			for await (const group of groups) {
				if (await group.filter.matches(note)) {
					color = group.color;
				}
			}

			if (color != null) {
				return color;
			}
			return undefined;
		},
	};
}
