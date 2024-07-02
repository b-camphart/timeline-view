import { presentNewTimelineLeaf } from "./presentNewTimeline";
import { listNotesInOrder } from "src/usecases/notes/list/listNotesInOrder";
import type { Workspace } from "src/obsidian/workspace";
import type { ObsidianVault } from "src/obsidian/Obsidian";
import { NoteProperty } from "src/note/property";

interface Context {
	workspace(): Workspace;
	vault(): ObsidianVault;
}

export function openTimelineView(ctx: Context) {
	listNotesInOrder(ctx.vault(), NoteProperty.Created, {
		presentOrderedNotes: presentNewTimelineLeaf.bind(null, ctx),
	});
}
