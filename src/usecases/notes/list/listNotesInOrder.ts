import type { Files } from "src/obsidian/files/Files";
import type { Note } from "src/obsidian/files/Note";
import type { Properties } from "src/obsidian/properties/Properties";
import {
	getPropertySelector,
	type FilePropertySelector,
} from "src/obsidian/timeline/settings/property/NotePropertySelector";

interface Context {
	files(): Files;
	properties(): Properties;
}

interface Output {
	presentOrderedNotes(
		notes: Note[],
		propertySelector: FilePropertySelector,
	): void;
}

export async function listNotesInOrder(
	ctx: Context,
	property: string,
	output: Output,
) {
	const propertySelector = getPropertySelector(
		property,
		ctx.properties().listKnownProperties(),
	);

	const notes = (await ctx.files().list()).toSorted(
		(a, b) =>
			propertySelector.selectProperty(a) -
			propertySelector.selectProperty(b),
	);

	output.presentOrderedNotes(notes, propertySelector);
}
