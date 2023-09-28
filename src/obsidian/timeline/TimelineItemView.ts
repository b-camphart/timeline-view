import { ItemView, TFile, type WorkspaceLeaf } from "obsidian";
import ObsidianTimeline from "./ObsidianTimeline.svelte"
import type { Obsidian } from "../Obsidian";
import type { PropertyType } from "../properties/Properties"; 
import type { Unsubscribe } from "../Events"
import type { Writable } from "svelte/store";
import { namespacedWritableFactory } from "../../timeline/Persistence";

export type TimelineItemViewState = {
    [key: string]: any
}

export interface TimelineItemViewStateStore {
    getStateForLeaf(leafId: string): Promise<TimelineItemViewState | null>;
    saveLeafState(leafId: string, state: TimelineItemViewState): Promise<void>;
    removeLeafState(leafId: string): Promise<void>;
}

export class TimelineItemView extends ItemView {

    static readonly viewType: string = "VIEW_TYPE_TIMELINE_VIEW"

    private leafId: string | undefined;
    private stateLoader: Promise<TimelineItemViewState | null>;
    private state: TimelineItemViewState | null;
    private component: ObsidianTimeline | null;
    private subscriptions: Unsubscribe[] | null;

    constructor(
        leaf: WorkspaceLeaf, 
        private guiStore: TimelineItemViewStateStore,
        private obsidian: Obsidian,
    ) {
        super(leaf)
        if ('id' in leaf && typeof leaf.id === "string") {
            this.leafId = leaf.id;
        }
        this.component = null;
        this.subscriptions = null;
        this.stateLoader = Promise.resolve(null);
        this.state = null;
    }

    getViewType(): string {
        return TimelineItemView.viewType
    }

    getDisplayText(): string {
        return "Timeline view"
    }

    async onload() {
        this.stateLoader = Promise.resolve(null);
        if (this.leafId != null) {
            this.stateLoader = this.guiStore.getStateForLeaf(this.leafId);
        }
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.setAttribute("style", "padding:0;position: relative;overflow-x:hidden;")

        this.state = await this.stateLoader;

        const writableState: Writable<TimelineItemViewState> = {
            set: (value) => {
                this.state = value;
                if (this.leafId != null) {
                    this.guiStore.saveLeafState(this.leafId, value)
                }
            },
            subscribe: (run, invalidate) => {
                run(this.state ?? {})
                return () => {
                    if (invalidate != null) {
                        invalidate(this.state ?? undefined)
                    }
                }
            },
            update: (updater) => {
                writableState.set(updater(this.state ?? {}))
            },
        }

        this.component = new ObsidianTimeline({
            target: container,
            props: {
                app: this.app,
                namespacedWritable: namespacedWritableFactory("", writableState),
                properties: this.obsidian.vault.properties,

            },
        });

        this.subscriptions = [
            this.obsidian.vault.files.on("created", (file: TFile) => {
                this.component?.addFile(file);
            }),
            this.obsidian.vault.files.on("deleted", (file: TFile) => {
                this.component?.deleteFile(file);
            }),
            this.obsidian.vault.files.on("renamed", (file: TFile, oldFile: string) => {
                this.component?.renameFile(file, oldFile);
            }),
            this.obsidian.vault.files.on("modified", (file: TFile) => {
                this.component?.modifyFile(file);
            }),
            this.obsidian.vault.properties.on("property-created", (name: string, type: PropertyType) => {
                this.component?.addProperty(name, type)
            }),
            this.obsidian.vault.properties.on("property-removed", (name: string) => {
                this.component?.removeProperty(name)
            }),
            this.obsidian.vault.properties.on("property-type-changed", (name: string, oldType: PropertyType, newType: PropertyType) => {
                this.component?.changePropertyType(name, newType)
            })
        ]

    }

    async onClose() {
        if (this.subscriptions != null) {
            this.subscriptions.forEach(unsubscribe => unsubscribe())
        }
        if (this.component != null) {
            this.component.$destroy()
        }
        if (this.leafId != null) {
            this.guiStore.removeLeafState(this.leafId);
        }
    }

}