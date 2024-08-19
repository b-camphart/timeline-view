import type { NoteProperty } from ".";

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
