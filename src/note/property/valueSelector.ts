import { type Note } from "src/note";

export interface NumericNoteValueSelector {
	selectValueFromNote(note: Note): number;
}
