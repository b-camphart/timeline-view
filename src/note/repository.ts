import type {Note} from ".";
import type {NoteFilter} from "./filter";

/**
 * Some external system that provides notes
 */
export interface NoteRepository {
	listAll(): Iterable<Note>;
	listAllMatchingFilter(filter: NoteFilter): Promise<Iterable<Note>>;
	getNoteFilterForQuery(query: string): NoteFilter;

	/**
	 * Returns a filter that matches everything if the query is blank
	 */
	getInclusiveNoteFilterForQuery(query: string): NoteFilter;

	/**
	 * Returns a filter that matches nothing if the query is blank
	 */
	getExclusiveNoteFilterForQuery(query: string): NoteFilter;
}

export interface MutableNoteRepository extends NoteRepository {
	createNote(note: {
		created?: number;
		modified?: number;
		properties?: Record<string, unknown>;
	}): Promise<Note>;
}
