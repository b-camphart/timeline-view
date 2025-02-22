import type {NoteRepository} from "src/note/repository";
import type {TimelineNoteSorterProperty} from "../sorting/TimelineNoteSorterProperty";
import type {NoteFilter} from "src/note/filter";

export async function createNewTimeline(
	notes: NoteRepository,
	order: TimelineNoteSorterProperty,
	filter: NoteFilter,
): Promise<{
	focalValue: number;
	filter: NoteFilter;
	order: TimelineNoteSorterProperty;
}> {
	const includedNotes = Array.from(await notes.listAllMatchingFilter(filter));
	order.sortNotes(includedNotes);

	const firstNote = includedNotes.at(0);
	const lastNote = includedNotes.at(-1);

	const minValue = firstNote ? order.selectValueFromNote(firstNote) ?? 0 : 0;
	const maxValue = lastNote ? order.selectValueFromNote(lastNote) ?? minValue : minValue;

	const range = maxValue - minValue;

	const focalValue = minValue + range / 2;

	return {
		focalValue,
		filter,
		order,
	};
}
