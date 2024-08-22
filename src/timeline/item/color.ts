import type {Note} from "src/note";

export interface TimelineItemColorSupplier {
	itemColorForNote(note: Note): string | undefined;
}
