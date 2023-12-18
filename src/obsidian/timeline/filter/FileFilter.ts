import type { TFile } from "obsidian";

export interface FileFilter {

    appliesTo(file: TFile): boolean

}

export function matchAllFilters(filters: FileFilter[]): FileFilter {
    if (filters.length === 1) return filters[0];
    return new MatchAll(filters);
}

class MatchAll implements FileFilter {

    constructor(private filters: FileFilter[]) { }

    appliesTo(file: TFile): boolean {
        return this.filters.every(filter => filter.appliesTo(file))
    }

}

export function negated(filters: FileFilter[]): FileFilter {
    return new Negated(filters)
}

class Negated implements FileFilter {

    constructor(private filters: FileFilter[]) {}

    appliesTo(file: TFile) {
        return this.filters.every(filter => !filter.appliesTo(file))
    }

}

export function orFilter(aFilters: FileFilter[], bFilters: FileFilter[]): FileFilter {
    return new OrFilter(aFilters, bFilters);
}

class OrFilter implements FileFilter {

    private a: FileFilter
    private b: FileFilter

    constructor(
        aFilters: FileFilter[],
        bFilters: FileFilter[]
    ) {
        this.a = matchAllFilters(aFilters)
        this.b = matchAllFilters(bFilters)
    }

    appliesTo(file: TFile) {
        return this.a.appliesTo(file) || this.b.appliesTo(file)
    }
}