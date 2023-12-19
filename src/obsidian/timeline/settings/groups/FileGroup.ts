import type { TFile } from "obsidian";
import type { FileFilter } from "../../filter/FileFilter";

export interface ItemGroup {
    query: string
    readonly filter: FileFilter
    color: string
}

export interface ColorSelector {
    selectColor(file: TFile): string | undefined;
    invalidate(path: string): void;
}

export function getColorSelector(
    groups: ItemGroup[]
): ColorSelector {
    return {
        selectColor(file) {
            const group = groups.find(group => group.filter.appliesTo(file))

            if (group != null) {
                return group.color
            }
            return undefined;
        },
        invalidate(path) {
            
        },
    }
}