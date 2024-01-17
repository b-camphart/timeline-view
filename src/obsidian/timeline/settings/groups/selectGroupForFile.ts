import type { Note } from "src/obsidian/files/Note";
import type { ItemGroup } from "./FileGroup";

export async function selectGroupForFile(groups: readonly ItemGroup[], file: Note) {
    for (const group of groups) {
        if (await file.matches(group.filter)) {
            return group
        }
    }
}