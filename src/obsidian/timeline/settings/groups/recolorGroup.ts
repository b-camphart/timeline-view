import type { TimelineItem } from "src/timeline/Timeline";
import type { ItemGroup } from "./FileGroup";
import type { TimelineNoteItem } from "src/timeline/TimelineNoteItem";

/**
 * Context for applying files to a group
 */
interface Context {
	recolorProcess: { stop: () => void } | undefined;
	readonly groups: {
		getGroup(groupId: string): ItemGroup | undefined;
		saveGroup(group: ItemGroup): void;
		list(): readonly ItemGroup[];
	};

	readonly items: {
		list(): readonly TimelineNoteItem[];
	};
}

interface Output {
	presentRecoloredGroup(group: ItemGroup): void;
	presentRecoloredItems(items: readonly TimelineItem[]): void;
}

export function recolorGroup(
	this: Context,
	groupId: string,
	color: string,
	output: Output,
) {
	// parse the query to get the filter and apply that to the group
	const group = this.groups.getGroup(groupId);
	if (group == null) return;

	this.recolorProcess?.stop();
	this.recolorProcess = undefined;

	group.color = color;

	this.groups.saveGroup(group);

	output.presentRecoloredGroup(group);

	const items = this.items.list().filter(it => it.group() === groupId);
	for (const item of items) {
		item.applyGroup(group);
	}

	output.presentRecoloredItems(items);
}
