import type { Note } from "src/note";
import type { ItemGroup } from "./FileGroup";

export async function selectGroupForFile(
	groups: readonly ItemGroup[],
	file: Note,
) {
	for (const group of groups) {
		if (await group.filter.matches(file)) {
			return group;
		}
	}
}
