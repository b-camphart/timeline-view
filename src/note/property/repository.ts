import { NoteProperty } from ".";

export interface NotePropertyRepository {
	listPropertiesOfTypes<T extends string>(
		types: readonly T[],
	): Promise<NoteProperty<T>[]>;

	getPropertyByName(name: string): Promise<NoteProperty<string> | null>;
}
