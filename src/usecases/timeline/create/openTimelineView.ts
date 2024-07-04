import { presentNewTimelineLeaf } from "./presentNewTimeline";
import { listNotesInOrder } from "src/usecases/notes/list/listNotesInOrder";
import type { Workspace } from "src/obsidian/workspace";
import { NoteProperty } from "src/note/property";
import type { NoteRepository } from "src/note/repository";


export function openTimelineView(notes: NoteRepository, workspace: Workspace) {
	listNotesInOrder(notes, NoteProperty.Created, {
		presentOrderedNotes: presentNewTimelineLeaf.bind(null, workspace),
	});
}
