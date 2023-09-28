import type { MetadataCache, TFile } from "obsidian";
import type { TimelineProperties } from "./TimelineProperties";

export interface FilePropertySelector {
    selectProperty(file: TFile): number;
}

export function getPropertySelector(
    prop: string | undefined,
    availableProperties: TimelineProperties,
    metadataCache: MetadataCache
): FilePropertySelector {
    if (prop === undefined) {
        return NoPropertySelector;
    }
    if (prop.toLocaleLowerCase() === "created") {
        return FileCreationSelector;
    }
    if (prop.toLocaleLowerCase() === "modified") {
        return FileModificationSelector;
    }
    if (prop in availableProperties) {
        const type = availableProperties[prop];
        if (type === "date" || type === "datetime") {
            return new DatePropertySelector(metadataCache, prop);
        } else {
            return new NumberPropertySelector(metadataCache, prop)
        }
    }
    return new UnknownPropertySelector(metadataCache, prop)
}

const NoPropertySelector: FilePropertySelector = {
    selectProperty(file: TFile): number {
        return 0;
    }
}

const FileCreationSelector: FilePropertySelector = {
    selectProperty(file: TFile): number {
        return file.stat.ctime
    }
}

const FileModificationSelector: FilePropertySelector = {
    selectProperty(file: TFile): number {
        return file.stat.mtime
    }
}

class DatePropertySelector implements FilePropertySelector {

    constructor(private metadataCache: MetadataCache, private property: string) { }

    selectProperty(file: TFile): number {
        const frontmatter = this.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter == null) {
            return 0;
        }
        const value = frontmatter[this.property];
        if (value == null) return 0;
        const date = new Date(value);
        const valueOf = date.valueOf();
        return valueOf;
    }

}

class NumberPropertySelector implements FilePropertySelector {
    constructor(private metadataCache: MetadataCache, private property: string) { }

    selectProperty(file: TFile): number {
        const frontmatter = this.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter == null) {
            return 0;
        }
        const value = frontmatter[this.property];
        if (value == null) return 0;
        if (typeof value === "string") {
            return parseInt(value);
        }
        return value;
    }
}

class UnknownPropertySelector implements FilePropertySelector {
    constructor(private metadataCache: MetadataCache, private property: string) { }

    selectProperty(file: TFile): number {
        const frontmatter = this.metadataCache.getFileCache(file)?.frontmatter;
        if (frontmatter == null) {
            return 0;
        }
        const value = frontmatter[this.property];
        if (value == null) return 0;

        const valueType = typeof value;
        console.log("type of", value, "is", valueType);
        if (valueType === "number" || valueType === "bigint")
            return value;
        if (valueType === "string") return parseFloat(value);
        console.warn(
            `Didn't understand how to work with "${valueType}."`,
            value,
            "constructor: ",
            value?.constructor
        );
        return 0;
    }
}