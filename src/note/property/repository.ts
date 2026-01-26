import { NoteProperty } from ".";

export class NotePropertyRepository<Impl> {
	impl: Impl;

	listPropertiesOfTypes: <T extends string>(this: NotePropertyRepository<Impl>, types: readonly T[]) => Promise<Error | NoteProperty<T>[]>;
	getPropertyByName: (this: NotePropertyRepository<Impl>, name: string) => Promise<Error | NoteProperty<string> | null>;

	constructor(def: Pick<NotePropertyRepository<Impl>, 'impl' | 'listPropertiesOfTypes' | 'getPropertyByName'>) {
		this.impl = def.impl;
		this.listPropertiesOfTypes = def.listPropertiesOfTypes;
		this.getPropertyByName = def.getPropertyByName;
	}
}
export type AnyNotePropertyRepository = NotePropertyRepository<any>;
