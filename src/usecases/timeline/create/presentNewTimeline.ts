import type { Workspace } from "src/obsidian/workspace";
import { OBSIDIAN_LEAF_VIEW_TYPE } from "../TimelineTab";
import type { Note } from "src/obsidian/files/Note";
import type { FilePropertySelector } from "src/obsidian/timeline/settings/property/NotePropertySelector";
import { TimelineFileItem } from "src/obsidian/timeline/TimelineFileItem";
import { createTimelineTab } from "src/obsidian/workspace/TimelineLeafView";

interface Context {
	workspace(): Workspace;
}

export { type Context as PresentNewTimelineLeafContext };

export async function presentNewTimelineLeaf(
	ctx: Context,
	notes: Note[],
	propertySelector: FilePropertySelector,
): Promise<void> {
	const items = notes.map(
		note => new TimelineFileItem(note, propertySelector),
	);

	const minValue = items.at(0)?.value() ?? 0;
	const maxValue = items.at(-1)?.value() ?? 0;
	const range = maxValue - minValue;

	const focalValue = minValue + range / 2;

	createTimelineTab(ctx.workspace(), { focalValue });
}
