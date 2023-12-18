import type { TFile } from "obsidian";
import type { FileFilter } from "../filter/FileFilter";
import type { Writable } from "svelte/store";

export interface ItemGroup {
    query: string
    readonly filter: FileFilter
    color: string
}

export function getColorSelector(
    groups: ItemGroup[]
): { selectColor(file: TFile): string | undefined } {
    return {
        selectColor(file) {
            const group = groups.find(group => group.filter.appliesTo(file))

            if (group != null) {
                return group.color
            }
            return undefined;
        },
    }
}