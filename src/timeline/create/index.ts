import type { Note } from "src/note";
import type { NoteProperty } from "src/note/property";
import type { NoteRepository } from "src/note/repository";
import {
	getPropertySelector,
	type FilePropertySelector,
} from "src/obsidian/timeline/settings/property/NotePropertySelector";
import type { TimelinePropertyType } from "src/obsidian/timeline/settings/property/TimelineProperties";

export async function createNewTimeline(
	notes: NoteRepository,
	initiallyOrderBy: NoteProperty<TimelinePropertyType>,
): Promise<{ focalValue: number }> {
	const propertySelector = getPropertySelector(initiallyOrderBy);

	const allNotes = (await notes.listAll()).toSorted(
		(a, b) =>
			propertySelector.selectProperty(a) -
			propertySelector.selectProperty(b),
	);

	const minValue =
		selectPropertyFromNote(propertySelector, allNotes.at(0)) ?? 0;
	const maxValue =
		selectPropertyFromNote(propertySelector, allNotes.at(-1)) ?? 0;
	const range = maxValue - minValue;

	const focalValue = minValue + range / 2;

	return {
		focalValue,
	};
}

function selectPropertyFromNote(
	propertySelector: FilePropertySelector,
	note: Note | undefined,
) {
	if (!note) return undefined;

	return propertySelector.selectProperty(note);
}
