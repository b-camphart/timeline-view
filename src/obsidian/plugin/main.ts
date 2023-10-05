/// <reference types="vite/client" />
import { Plugin } from "obsidian";
import { TimelineItemView, type TimelineItemViewStateStore, type TimelineItemViewState } from "../timeline/TimelineItemView";
import { properties } from "../properties/Properties";
import type { Obsidian, ObsidianVault } from "../Obsidian";
import { files } from "../files/Files";


type TimelinePluginSaveData = {
    [leafId: string]: TimelineItemViewState
}

const DEFAULT_DATA: TimelinePluginSaveData = {}

export default class ObsidianTimelinePlugin extends Plugin implements Obsidian, TimelineItemViewStateStore {

    private saveState: TimelinePluginSaveData = {};

    private properties = properties(this.app.vault, this.app.metadataCache)
    private files = files(this.app.vault);

    async onload(): Promise<void> {
        // load settings
        this.saveState = Object.assign({}, DEFAULT_DATA, await this.loadData());

        this.registerView(TimelineItemView.viewType, (leaf) => new TimelineItemView(leaf, this, this))

        this.addRibbonIcon("waves", "Open timeline view", () => this.openTimelineView())
        this.addCommand({
            id: "open-timeline-view",
            name: "Open timeline view",
            callback: () => this.openTimelineView()
        })

        this.registerEvent(this.app.metadataCache.on("changed", this.properties.metadataChanged.bind(this.properties)))
        this.registerEvent(this.app.metadataCache.on("changed", this.files.fileModified.bind(this.files)));
        this.registerEvent(this.app.vault.on("create", this.files.fileCreated.bind(this.files)))
        this.registerEvent(this.app.vault.on("rename", this.files.fileRenamed.bind(this.files)))
        this.registerEvent(this.app.vault.on("modify", this.files.fileModified.bind(this.files)))
        this.registerEvent(this.app.vault.on("delete", this.files.fileDeleted.bind(this.files)))


        if (import.meta.env.MODE === "development") {
            if (await this.app.vault.adapter.exists("___reload.md")) {
                await this.app.vault.adapter.remove("___reload.md");
            }

            this.registerEvent(
                this.app.workspace.on("file-open", (file) => {
                    if (file?.path === "___reload.md") {
                        this.app.vault.adapter.remove(file.path)
                            .then(() => location.reload())
                    }
                })
            );
        }

    }

    async getStateForLeaf(leafId: string): Promise<TimelineItemViewState | null> {
        return this.saveState[leafId] ?? null;
    }

    async saveLeafState(leafId: string, state: TimelineItemViewState): Promise<void> {
        this.saveState[leafId] = state;
        await this.saveData(this.saveState)
    }

    async removeLeafState(leafId: string): Promise<void> {
        delete this.saveState[leafId];
        await this.saveData(this.saveState)
    }

    async onunload(): Promise<void> {
        const leaves = this.app.workspace
            .getLeavesOfType(TimelineItemView.viewType)
        for (const leaf of leaves) {
            leaf.detach()
        }
    }

    async openTimelineView() {
        const leaf = this.app.workspace.getLeaf(true)
        leaf.setViewState({
            type: TimelineItemView.viewType,
            active: true
        });
        this.app.workspace.revealLeaf(leaf);
    }

    vault: ObsidianVault = {

        properties: this.properties,

        files: this.files,

    }
}