import type { TFile } from "obsidian";

export interface FileFilter {

    appliesTo(file: TFile): boolean

}

export function matchAllFilters(filters: FileFilter[]): FileFilter {
    return new MatchAll(filters);
}

class MatchAll implements FileFilter {

    constructor(private filters: FileFilter[]) { }

    appliesTo(file: TFile): boolean {
        return this.filters.every(filter => filter.appliesTo(file))
    }

}
