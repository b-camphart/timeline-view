import type { Note } from ".";

export interface NoteSorter {
	sortNotes(notes: Note[]): void;
}