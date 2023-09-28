import type { Unsubscribe } from "../Events";
import { TFile, type TAbstractFile, type Vault } from 'obsidian';

export interface Files {

    list(): Promise<TFile[]>

    on(eventType: "created", listener: (file: TFile) => void): Unsubscribe;
    on(eventType: "deleted", listener: (file: TFile) => void): Unsubscribe;
    on(eventType: "modified", listener: (file: TFile) => void): Unsubscribe;
    on(eventType: "renamed", listener: (file: TFile, oldFile: string) => void): Unsubscribe;

}

export interface ObsidianFileListener {

    fileCreated(file: TAbstractFile): void;
    fileModified(file: TAbstractFile): void;
    fileRenamed(file: TAbstractFile, oldPath: string): void;
    fileDeleted(file: TAbstractFile): void;

}

export function files(vault: Vault): ObsidianFileListener & Files {
    return new ObsidianFiles(vault);
}


type FileEvent = 'created' | 'deleted' | 'modified' | 'renamed';

class ObsidianFiles implements Files, ObsidianFileListener {

    constructor(private vault: Vault) {}

    async list(): Promise<TFile[]> {
        return this.vault.getMarkdownFiles();
    }

    private subscriptions = {
        "created": [] as ((file: TFile) => void)[],
        "renamed": [] as ((file: TFile, oldPath: string) => void)[],
        "modified": [] as ((file: TFile) => void)[],
        "deleted": [] as ((file: TFile) => void)[]
    } as const

    on(eventType: "created", listener: (file: TFile) => void): () => void;
    on(eventType: "deleted", listener: (file: TFile) => void): () => void;
    on(eventType: "modified", listener: (file: TFile) => void): () => void;
    on(eventType: "renamed", listener: (file: TFile, oldFile: string) => void): () => void;
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
            listener(file)
        }
    }

    fileRenamed(file: TAbstractFile, oldPath: string): void {
        if (! (file instanceof TFile)) {
            return
        }
        const listeners = this.subscriptions["renamed"]
        for (const listener of listeners) {
            listener(file, oldPath)
        }
    }

    fileModified(file: TAbstractFile): void {
        if (! (file instanceof TFile)) {
            return
        }
        const listeners = this.subscriptions["modified"];
        for (const listener of listeners) {
            listener(file)
        }
    }

    fileDeleted(file: TAbstractFile): void {
        if (! (file instanceof TFile)) {
            return
        }
        const listeners = this.subscriptions["deleted"]
        for (const listener of listeners) {
            listener(file)
        }
    }

}