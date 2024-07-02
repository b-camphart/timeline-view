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

	static #Created: NoteProperty<"datetime"> | null = null;
	static get Created() {
		if (!this.#Created) {
			this.#Created = new NoteProperty("created", "datetime");
		}
		return this.#Created;
	}

	static #Modified: NoteProperty<"datetime"> | null = null;
	static get Modified() {
		if (!this.#Modified) {
			this.#Modified = new NoteProperty("modified", "datetime");
		}
		return this.#Modified;
	}
}
