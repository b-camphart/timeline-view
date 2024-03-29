/// <reference types="vite/client" />
import { Plugin } from "obsidian";
import { properties } from "../properties/Properties";
import type { Obsidian, ObsidianVault } from "../Obsidian";
import { files } from "../files/Files";
import { type PresentNewTimelineLeafContext } from "src/usecases/timeline/create/presentNewTimeline";
import { Workspace } from "../workspace";
import { registerTimelineTab } from "../workspace/TimelineLeafView";
import { openTimelineView } from "src/usecases/timeline/create/openTimelineView";

export default class ObsidianTimelinePlugin
	extends Plugin
	implements Obsidian, PresentNewTimelineLeafContext
{
	private properties = properties(this.app.vault, this.app.metadataCache);
	private files = files(this.app.vault, this.app.metadataCache);

	async onload(): Promise<void> {
		registerTimelineTab(this, this);

		this.addRibbonIcon("waypoints", "Open timeline view", () =>
			openTimelineView(this),
		);
		this.addCommand({
			id: "open-timeline-view",
			name: "Open timeline view",
			callback: () => openTimelineView(this),
		});

		this.registerEvent(
			this.app.metadataCache.on(
				"changed",
				this.properties.metadataChanged.bind(this.properties),
			),
		);
		this.registerEvent(
			this.app.metadataCache.on(
				"changed",
				this.files.fileModified.bind(this.files),
			),
		);
		this.registerEvent(
			this.app.vault.on(
				"create",
				this.files.fileCreated.bind(this.files),
			),
		);
		this.registerEvent(
			this.app.vault.on(
				"rename",
				this.files.fileRenamed.bind(this.files),
			),
		);
		this.registerEvent(
			this.app.vault.on(
				"modify",
				this.files.fileModified.bind(this.files),
			),
		);
		this.registerEvent(
			this.app.vault.on(
				"delete",
				this.files.fileDeleted.bind(this.files),
			),
		);

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

	vault(): ObsidianVault {
		return {
			properties: () => this.properties,

			files: () => this.files,
		};
	}

	private _workspace = new Workspace(this.app);
	workspace(): Workspace {
		return this._workspace;
	}
}
