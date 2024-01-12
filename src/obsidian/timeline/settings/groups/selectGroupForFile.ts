import type { TFile } from "obsidian";
import type { ItemGroup } from "./FileGroup";

export async function selectGroupForFile(groups: readonly ItemGroup[], file: TFile) {
    for (const group of groups) {
        if (await group.filter.appliesTo(file)) {
            return group
        }
    }
}