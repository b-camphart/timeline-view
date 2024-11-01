import type { Note } from "src/note/Note";

export class NoteProperty<T extends string> {
	constructor(name: string, type: T) {
		this.#name = name;
		this.#type = type;
	}

	#name: string;
	name(): string {
		return this.#name;
	}

	#type: T;
	type(): T {
		return this.#type;
	}

	selectFrom(note: Note): unknown {
		return note.properties()[this.#name];
	}
}
