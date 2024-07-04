import type { Note } from "src/note";
import type { NoteProperty } from "src/note/property";
import type { NoteRepository } from "src/note/repository";
import {
	getPropertySelector,
	type FilePropertySelector,
} from "src/obsidian/timeline/settings/property/NotePropertySelector";
import type { TimelinePropertyType } from "src/obsidian/timeline/settings/property/TimelineProperties";

interface Output {
	presentOrderedNotes(
		notes: Note[],
		propertySelector: FilePropertySelector,
	): void;
}

export async function listNotesInOrder(
	notes: NoteRepository,
	property: NoteProperty<TimelinePropertyType>,
	output: Output,
) {
	const propertySelector = getPropertySelector(property);

	const allNotes = (await notes.listAll()).toSorted(
		(a, b) =>
			propertySelector.selectProperty(a) -
			propertySelector.selectProperty(b),
	);

	output.presentOrderedNotes(allNotes, propertySelector);
}
