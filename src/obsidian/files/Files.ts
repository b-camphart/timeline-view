import { parse, type FileFilter } from "obsidian-search";
import type { Unsubscribe } from "../Events";
import { TFile, type TAbstractFile, type Vault, MetadataCache } from 'obsidian';
import { Note } from './Note'

export interface Files {

    list(): Promise<Note[]>
    parseFilter(query: string, defaultFilter?: FileFilter): FileFilter;

    on(eventType: "created", listener: (file: Note) => void): Unsubscribe;
    on(eventType: "deleted", listener: (file: Note) => void): Unsubscribe;
    on(eventType: "modified", listener: (file: Note) => void): Unsubscribe;
    on(eventType: "renamed", listener: (file: Note, oldFile: string) => void): Unsubscribe;

}

export interface ObsidianFileListener {

    fileCreated(file: TAbstractFile): void;
    fileModified(file: TAbstractFile): void;
    fileRenamed(file: TAbstractFile, oldPath: string): void;
    fileDeleted(file: TAbstractFile): void;

}

export function files(vault: Vault, metadata: MetadataCache): ObsidianFileListener & Files {
    return new ObsidianFiles(vault, metadata);
}


type FileEvent = 'created' | 'deleted' | 'modified' | 'renamed';

class ObsidianFiles implements Files, ObsidianFileListener {

    constructor(private vault: Vault, private metadata: MetadataCache) {}

    async list(): Promise<Note[]> {
        return this.vault.getMarkdownFiles().map(tFile => new Note(tFile, this.metadata));
    }

    parseFilter(query: string, defaultFilter: FileFilter<TFile>): FileFilter<TFile> {
        return parse(query, this.metadata, defaultFilter)
    }

    private subscriptions = {
        "created": [] as ((file: Note) => void)[],
        "renamed": [] as ((file: Note, oldPath: string) => void)[],
        "modified": [] as ((file: Note) => void)[],
        "deleted": [] as ((file: Note) => void)[]
    } as const

    on(eventType: "created", listener: (file: Note) => void): () => void;
    on(eventType: "deleted", listener: (file: Note) => void): () => void;
    on(eventType: "modified", listener: (file: Note) => void): () => void;
    on(eventType: "renamed", listener: (file: Note, oldFile: string) => void): () => void;
    on(eventType: FileEvent, listener: any): () => void {
        const subscriptions = this.subscriptions[eventType];
        subscriptions.push(listener);
        return () => {
            subscriptions.remove(listener);
        }
    }

    fileCreated(file: TAbstractFile): void {
        if (! (file instanceof TFile)) {
            return
        }
        const listeners = this.subscriptions["created"]
        for (const listener of listeners) {
            listener(new Note(file, this.metadata))
        }
    }

    fileRenamed(file: TAbstractFile, oldPath: string): void {
        if (! (file instanceof TFile)) {
            return
        }
        const listeners = this.subscriptions["renamed"]
        for (const listener of listeners) {
            listener(new Note(file, this.metadata), oldPath)
        }
    }

    fileModified(file: TAbstractFile): void {
        if (! (file instanceof TFile)) {
            return
        }
        const listeners = this.subscriptions["modified"];
        for (const listener of listeners) {
            listener(new Note(file, this.metadata))
        }
    }

    fileDeleted(file: TAbstractFile): void {
        if (! (file instanceof TFile)) {
            return
        }
        const listeners = this.subscriptions["deleted"]
        for (const listener of listeners) {
            listener(new Note(file, this.metadata))
        }
    }

}