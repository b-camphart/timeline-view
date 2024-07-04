import type { Note } from "src/note";

export interface NoteFilter {
	query(): string;
	matches(note: Note): Promise<boolean>;
}
