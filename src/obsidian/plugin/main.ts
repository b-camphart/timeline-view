/// <reference types="vite/client" />
import { Plugin } from "obsidian";
import type { Obsidian } from "../Obsidian";
import { Workspace } from "../workspace";
import { TimelineLeafView } from "../workspace/TimelineLeafView";
import { getMetadataTypeManager } from "../MetadataTypeManager";
import { ObsidianNotePropertyRepository } from "src/note/property/obsidian-repository";
import { ObsidianNoteRepository } from "src/note/obsidian-repository";
import {
	OBSIDIAN_LEAF_VIEW_TYPE,
	TimelineTab,
} from "src/usecases/timeline/TimelineTab";
import { NoteProperty } from "src/note/property";
import { createNewTimeline } from "src/timeline/create";

let creationCallback: undefined | ((tab: TimelineTab) => void);

export default class ObsidianTimelinePlugin extends Plugin implements Obsidian {
	async onload(): Promise<void> {
		const notes = new ObsidianNoteRepository(
			this.app.vault,
			this.app.metadataCache,
		);
		const properties = new ObsidianNotePropertyRepository(
			this.app.vault.adapter,
			() => getMetadataTypeManager(this.app),
		);

		const openTimelineView = async () => {
			const timeline = await createNewTimeline(
				notes,
				NoteProperty.Created,
			)
			creationCallback = tab => {
				creationCallback = undefined;
				tab.transientState = { isNew: true };
			};
			const leaf = this.app.workspace.getLeaf(true);
			leaf.setViewState({
				type: OBSIDIAN_LEAF_VIEW_TYPE,
				active: true,
				state: {
					focalValue: timeline.focalValue,
				},
			});
		};

		this.registerView(OBSIDIAN_LEAF_VIEW_TYPE, leaf => {
			const tab = new TimelineTab(notes, properties);
			if (creationCallback) {
				creationCallback(tab);
			}
			const view = new TimelineLeafView(
				leaf,
				tab,
				this.workspace(),
				this.app.vault,
				this.app.metadataCache,
			);
			return view;
		});

		this.addRibbonIcon("waypoints", "Open timeline view", () =>
			openTimelineView(),
		);
		this.addCommand({
			id: "open-timeline-view",
			name: "Open timeline view",
			callback: () => openTimelineView(),
		});

		if (import.meta.env.MODE === "development") {
			if (await this.app.vault.adapter.exists("___reload.md")) {
				await this.app.vault.adapter.remove("___reload.md");
			}

			this.registerEvent(
				this.app.workspace.on("file-open", file => {
					if (file?.path === "___reload.md") {
						this.app.vault.adapter
							.remove(file.path)
							.then(() => location.reload());
					}
				}),
			);
		}
	}

	private _workspace = new Workspace(this.app);
	workspace(): Workspace {
		return this._workspace;
	}
}
