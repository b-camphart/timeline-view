import type obsidian from "obsidian";

export interface SearchView extends obsidian.View {
	searchQuery: {
		query: string;
	};
}
