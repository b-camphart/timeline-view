import type {Note} from "src/note";

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

export interface NotePropertyValueSelector {
	selectValueFromNote(note: Note): unknown;
}

export function isTypeOf<S extends string>(
	types: readonly S[],
	type: string,
): type is S {
	return types.includes(type as S);
}

export function isNotePropertyOfType<S extends string>(
	types: readonly S[],
	property: NoteProperty<string>,
): property is NoteProperty<S> {
	return isTypeOf(types, property.type());
}

export interface Repository {
	listPropertiesOfTypes<T extends string>(
		types: readonly T[],
	): Promise<NoteProperty<T>[]>;

	getPropertyByName(name: string): Promise<NoteProperty<string> | null>;
}
