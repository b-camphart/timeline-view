import {exists} from "src/utils/null";
import type {TimelineNoteItem} from "../TimelineNoteItem";
import type {QueryFilterReaderWriter} from "./query";
import type {NoteRepository} from "src/note/repository";

export class TimelineItemQueryFilter implements QueryFilterReaderWriter {
	constructor(
		notes: NoteRepository,
		query: string,
		onQueryChange: (query: string) => void,
	) {
		this.#notes = notes;
		this.#onQueryChange = onQueryChange;
		this.#filter = notes.getInclusiveNoteFilterForQuery(query);
	}

	#filter;

	noteFilter() {
		return this.#filter;
	}

	query(): string {
		return this.#filter.query();
	}

	#notes;
	#onQueryChange;

	filterByQuery(query: string): void {
		this.#filter = this.#notes.getInclusiveNoteFilterForQuery(query);
		this.#onQueryChange(query);
	}

	async filteredItems(items: Iterable<TimelineNoteItem>) {
		const itemsOrNull = await Promise.all(
			[...items].map(async item => {
				if (await this.#filter.matches(item.note)) {
					return item;
				}
				return null;
			}),
		);

		return itemsOrNull.filter(exists);
	}

	async accepts(item: TimelineNoteItem) {
		return await this.#filter.matches(item.note);
	}
}
