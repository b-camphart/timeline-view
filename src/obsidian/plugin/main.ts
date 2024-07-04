/// <reference types="vite/client" />
import { Plugin } from "obsidian";
import type { Obsidian } from "../Obsidian";
import { Workspace } from "../workspace";
import { registerTimelineTab } from "../workspace/TimelineLeafView";
import { openTimelineView } from "src/usecases/timeline/create/openTimelineView";
import { getMetadataTypeManager } from "../MetadataTypeManager";
import { ObsidianNotePropertyRepository } from "src/note/property/obsidian-repository";
import { ObsidianNoteRepository } from "src/note/obsidian-repository";

export default class ObsidianTimelinePlugin extends Plugin implements Obsidian {
	async onload(): Promise<void> {
		const notes = new ObsidianNoteRepository(
			this.app.vault,
			this.app.metadataCache,
		);

		registerTimelineTab(
			this,
			this._workspace,
			this.app.vault,
			this.app.metadataCache,
			notes,
			new ObsidianNotePropertyRepository(this.app.vault.adapter, () =>
				getMetadataTypeManager(this.app),
			),
		);

		this.addRibbonIcon("waypoints", "Open timeline view", () =>
			openTimelineView(notes, this._workspace),
		);
		this.addCommand({
			id: "open-timeline-view",
			name: "Open timeline view",
			callback: () => openTimelineView(notes, this._workspace),
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
