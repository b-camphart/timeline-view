/// <reference types="vite/client" />
import { Plugin, WorkspaceLeaf } from "obsidian";
import { getMetadataTypeManager } from "../MetadataTypeManager";
import { ObsidianNotePropertyRepository } from "src/note/property/obsidian-repository";
import { ObsidianNoteRepository } from "src/note/obsidian-repository";
import { createNewTimeline } from "src/timeline/create";
import { TimelineNoteOrder } from "src/timeline/order/ByNoteProperty";
import { TimelineItemView } from "./timeline-item-view";

export const OBSIDIAN_LEAF_VIEW_TYPE: string = "VIEW_TYPE_TIMELINE_VIEW";
export const LUCID_ICON = "waypoints";

export default class ObsidianTimelinePlugin extends Plugin {
	async onload(): Promise<void> {
		const notes = new ObsidianNoteRepository(
			this.app.vault,
			this.app.metadataCache,
			this.app.fileManager,
		);
		const properties = new ObsidianNotePropertyRepository(
			this.app.vault.adapter,
			() => getMetadataTypeManager(this.app),
		);

		const openTimelineView = async (
			leaf: WorkspaceLeaf,
			group?: WorkspaceLeaf,
		) => {
			const timeline = await createNewTimeline(
				notes,
				TimelineNoteOrder.ByNoteCreated,
			);
			leaf.setViewState({
				type: OBSIDIAN_LEAF_VIEW_TYPE,
				active: true,
				state: {
					focalValue: timeline.focalValue,
					isNew: true,
				},
				group,
			});
		};

		const openTimelineViewInNewLeaf = () => {
			openTimelineView(this.app.workspace.getLeaf(true));
		};

		this.registerView(OBSIDIAN_LEAF_VIEW_TYPE, leaf => {
			const view = new TimelineItemView(
				leaf,
				this.app.vault,
				this.app.metadataCache,
				this.app.workspace,
				this.app.fileManager,
				notes,
				properties,
			);
			return view;
		});

		this.addRibbonIcon(LUCID_ICON, "Open timeline view", () =>
			openTimelineViewInNewLeaf(),
		);
		this.addCommand({
			id: "open-timeline-view",
			name: "Open timeline view",
			callback: () => openTimelineViewInNewLeaf(),
			icon: LUCID_ICON,
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, editor, info) => {
				if (info !== "more-options") {
					return;
				}
				menu.addItem(item => {
					item.setSection("view.linked");
					item.setTitle("Open timeline view");
					item.setIcon(LUCID_ICON);
					item.onClick(() => {
						openTimelineView(
							this.app.workspace.getLeaf("split", "horizontal"),
							this.app.workspace.getMostRecentLeaf() ?? undefined,
						);
					});
				});
			}),
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

	onunload(): void {
		this.app.workspace.detachLeavesOfType(OBSIDIAN_LEAF_VIEW_TYPE);
	}
}
