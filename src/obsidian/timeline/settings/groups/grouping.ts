import type { TFile } from "obsidian";
import { matchAllFilters, type FileFilter } from "../../filter/FileFilter";
import { parseFileSearchQuery } from "../../filter/parser";

export function groupFilter(query: string): FileFilter {
    return parseFileSearchQuery(query, defaultGroupFilter)
}

function defaultGroupFilter(filters: FileFilter[]): FileFilter {
    if (filters.length === 0) {
        return NeverMatches
    }
    return matchAllFilters(filters)
}

const NeverMatches: FileFilter = {
    appliesTo(file: TFile): boolean {
        return false
    }
}