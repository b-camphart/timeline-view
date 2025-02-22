import type { QueryFilterReaderWriter } from "./query";
import type { NoteRepository } from "src/note/repository";

export class TimelineItemQueryFilter implements QueryFilterReaderWriter {
	constructor(
		notes: NoteRepository,
		query: string,
		onQueryChange: (query: string) => void
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

	#debounce: null | ReturnType<typeof setTimeout> = null;
	filterByQuery(query: string): void {
		this.#filter = this.#notes.getInclusiveNoteFilterForQuery(query);

		if (this.#debounce) {
			clearTimeout(this.#debounce);
			this.#debounce = setTimeout(() => {
				this.#onQueryChange(query);
				this.#debounce = null;
			}, 350);
		} else {
			this.#onQueryChange(query);
		}
	}
}
