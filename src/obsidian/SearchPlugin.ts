import type * as obsidian from "obsidian";

export interface SearchView extends obsidian.View {
	searchQuery: {
		query: string;
	};
}
