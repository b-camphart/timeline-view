import type { FileFilter } from "obsidian-search";

export const MatchAllEmptyQuery: FileFilter = {
    async appliesTo(file) {
        return true
    },
    and(filter) {
        return filter
    },
    or(filter) {
        return filter
    },
}