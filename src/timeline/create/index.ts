import type { NoteRepository } from "src/note/repository";
import type { TimelineNoteOrder } from "../order/ByNoteProperty";

export async function createNewTimeline(
	notes: NoteRepository,
	order: TimelineNoteOrder,
): Promise<{ focalValue: number }> {
	const allNotes = await notes.listAll();
	order.sortNotes(allNotes);

	const firstNote = allNotes.at(0);
	const lastNote = allNotes.at(-1);

	const minValue = firstNote ? order.selectValueFromNote(firstNote) : 0;
	const maxValue = lastNote ? order.selectValueFromNote(lastNote) : minValue;

	const range = maxValue - minValue;

	const focalValue = minValue + range / 2;

	return {
		focalValue,
	};
}
