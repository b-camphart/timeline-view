import type { Workspace } from "src/obsidian/workspace";
import type { FilePropertySelector } from "src/obsidian/timeline/settings/property/NotePropertySelector";
import { TimelineFileItem } from "src/obsidian/timeline/TimelineFileItem";
import { createTimelineTab } from "src/obsidian/workspace/TimelineLeafView";
import type { Note } from "src/note";

export async function presentNewTimelineLeaf(
	workspace: Workspace,
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

	createTimelineTab(workspace, { focalValue });
}
