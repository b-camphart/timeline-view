/// <reference types="vite/client" />
import * as obsidian from "obsidian";
import * as MetadataTypeManager from "src/obsidian/MetadataTypeManager";
import * as property from "src/note/property/obsidian-repository";
import * as note from "src/note/obsidian-repository";
import * as createTimeline from "src/timeline/create";
import * as timelineItemView from "./timeline-item-view";
import * as timelineSettingsTab from "./timeline-settings-tab";

export const OBSIDIAN_LEAF_VIEW_TYPE: string = "VIEW_TYPE_TIMELINE_VIEW";
export const LUCID_ICON = "waypoints";

export default class ObsidianTimelinePlugin extends obsidian.Plugin {
	async onload(): Promise<void> {
		const notes = new note.ObsidianNoteRepository(
			this.app.vault,
			this.app.metadataCache,
			this.app.fileManager,
		);
		const properties = new property.ObsidianNotePropertyRepository(
			() =>
				this.app.vault.adapter.read(
					obsidian.normalizePath(".obsidian/types.json"),
				),
			() => MetadataTypeManager.getMetadataTypeManager(this.app),
		);

		const timelineSettings =
			new timelineSettingsTab.ObsidianSettingsTimelineTab(
				this.app,
				this,
				properties,
				notes,
			);
		this.addSettingTab(timelineSettings);

		const openTimelineView = async (
			leaf: obsidian.WorkspaceLeaf,
			group?: obsidian.WorkspaceLeaf,
		) => {
			const sorter = (
				await timelineSettings.noteOrder()
			).selectedProperty();
			const filter = await timelineSettings.noteFilter();
			const groups = await timelineSettings.groups();
			const timeline = await createTimeline.createNewTimeline(
				notes,
				sorter,
				filter.noteFilter(),
			);
			leaf.setViewState({
				type: OBSIDIAN_LEAF_VIEW_TYPE,
				active: true,
				state: {
					settings: {
						property: {
							property: sorter.name(),
						},
						filter: {
							query: filter.query(),
						},
						groups: {
							groups: groups.groups().map(group => {
								return {
									query: group.query(),
									color: group.color(),
								};
							}),
						},
					},
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
			const view = new timelineItemView.TimelineItemView(
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
