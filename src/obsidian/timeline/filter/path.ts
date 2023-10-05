import type { TFile } from "obsidian";
import type { FileFilter } from "./FileFilter";

export function filterByPath(path: string): FileFilter {
    return new PathFilter(path)
}

export function filterByPathPattern(path: RegExp): FileFilter {
    return new PathRegexFilter(path)
}


class PathFilter implements FileFilter {

    constructor(private path: string) {}

    appliesTo(file: TFile): boolean {
        return file.path.includes(this.path)
    }

}

class PathRegexFilter implements FileFilter {

    constructor(private path: RegExp) {}

    appliesTo(file: TFile): boolean {
        return this.path.test(file.path);
    }
}