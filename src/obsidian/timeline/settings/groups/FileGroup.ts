import type { MetadataCache, TFile } from "obsidian";
import { parse, type FileFilter } from 'obsidian-search';

export interface ItemGroup {
    id: string
    query: string
    readonly filter: FileFilter
    color: string
}

export interface ColorSelector {
    selectColor(file: TFile): Promise<string | undefined>;
}

export function getColorSelector(
    groups: ItemGroup[]
): ColorSelector {
    return {
        async selectColor(file) {
            let color: string | undefined;
            for await (const group of groups) {
                if (await group.filter.appliesTo(file)) {
                    color = group.color
                }
            }

            if (color != null) {
                return color
            }
            return undefined;
        }
    }
}