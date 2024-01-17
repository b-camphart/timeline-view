import type { MetadataCache, TFile, WorkspaceLeaf } from "obsidian";
import type { FileFilter } from "obsidian-search";

export class Note {

    constructor(
        private tFile: TFile,
        private metadataCache: MetadataCache
    ) {}

    path(): string {
        return this.tFile.path
    }

    nameWithoutExtension(): string {
        return this.tFile.basename
    }

    createdAt(): number {
        return this.tFile.stat.ctime        
    }

    modifiedAt(): number {
        return this.tFile.stat.mtime
    }

    metadata(): Record<string, any> | null {
        return this.metadataCache.getFileCache(this.tFile)?.frontmatter ?? null
    }

    matches(filter: FileFilter): Promise<boolean> {
        return filter.appliesTo(this.tFile)
    }

    openIn(leaf: WorkspaceLeaf) {
        return leaf.openFile(this.tFile)
    }

}