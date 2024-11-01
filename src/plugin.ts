/// <reference types="vite/client" />
import * as obsidian from "obsidian";
import * as MetadataTypeManager from "src/obsidian/MetadataTypeManager";
import * as property from "src/note/property/obsidian-repository";
import * as note from "src/note/obsidian-repository";
import * as createTimeline from "src/timeline/create";
import * as view from "src/view";
import * as timelineSettingsTab from "src/settings";
import * as tags from "src/obsidian/tags";
import type { SearchView } from "src/obsidian/SearchPlugin";

function assignTimelineViewToLeaf(
	leaf: obsidian.WorkspaceLeaf,
	timeline: view.TimelineItemViewState & { isNew?: boolean },
	group?: obsidian.WorkspaceLeaf,
) {
	leaf.setViewState({
		type: view.Timeline.TYPE,
		active: true,
		state: timeline,
		group,
	});
}

export class ObsidianTimelinePlugin extends obsidian.Plugin {
	async onload(): Promise<void> {
		const notes = new note.ObsidianNoteRepository(this.app.vault, this.app.metadataCache, this.app.fileManager);
		const properties = new property.ObsidianNotePropertyRepository(
			() => this.app.vault.adapter.read(obsidian.normalizePath(".obsidian/types.json")),
			() => MetadataTypeManager.getMetadataTypeManager(this.app),
		);

		const timelineSettings = new timelineSettingsTab.ObsidianSettingsTimelineTab(this.app, this, properties, notes);
		this.addSettingTab(timelineSettings);

		const openTimelineView = async (
			leaf: obsidian.WorkspaceLeaf,
			group?: obsidian.WorkspaceLeaf,
			overrides?: {
				filterQuery?: string;
			},
		) => {
			const sorter = (await timelineSettings.noteOrder()).selectedProperty();
			const filter = await timelineSettings.noteFilter();
			const groups = await timelineSettings.groups();
			const timeline = await createTimeline.createNewTimeline(
				notes,
				sorter,
				overrides?.filterQuery
					? notes.getInclusiveNoteFilterForQuery(overrides.filterQuery)
					: filter.noteFilter(),
			);
			assignTimelineViewToLeaf(
				leaf,
				{
					settings: {
						// @ts-expect-error
						property: {
							property: timeline.order.name(),
						},
						// @ts-expect-error
						filter: {
							query: timeline.filter.query(),
						},
						// @ts-expect-error
						groups: {
							groups: groups.groups().map((group) => {
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
			);
		};

		const openTimelineViewInNewLeaf = (overrides?: { orderedBy?: string; filterQuery?: string }) => {
			openTimelineView(this.app.workspace.getLeaf(true), undefined, overrides);
		};

		this.registerView(view.Timeline.TYPE, (leaf) => {
			return new view.Timeline(
				leaf,
				this.app.vault,
				this.app.metadataCache,
				this.app.workspace,
				this.app.fileManager,
				notes,
				properties,
			);
		});

		this.addRibbonIcon(view.Timeline.ICON, "Open timeline view", (event) => {
			const previousState = view.Timeline.getPreviouslyClosedState();
			if (event.button === 2) {
				const menu = new obsidian.Menu().addItem((item) => {
					item.setTitle("Open new timeline view").onClick(() => {
						openTimelineViewInNewLeaf();
					});
				});
				if (previousState != null) {
					menu.addItem((item) => {
						item.setTitle("Re-open closed timeline view").onClick(() => {
							assignTimelineViewToLeaf(this.app.workspace.getLeaf(true), {
								...previousState,
								isNew: false,
							});
						});
					});
				}
				menu.showAtMouseEvent(event);
			} else {
				if (timelineSettings.usePreviousState() && previousState != null) {
					assignTimelineViewToLeaf(this.app.workspace.getLeaf(true), {
						...previousState,
						isNew: false,
					});
				} else {
					openTimelineViewInNewLeaf();
				}
			}
		});
		this.addCommand({
			id: "open-timeline-view",
			name: "Open timeline view",
			callback: () => openTimelineViewInNewLeaf(),
			icon: view.Timeline.ICON,
		});
		this.addCommand({
			id: "reopen-timeline-view",
			name: "Re-open timeline view",
			checkCallback: (checking) => {
				if (checking) return view.Timeline.hasClosedState();

				const previousState = view.Timeline.getPreviouslyClosedState();
				if (previousState != null) {
					assignTimelineViewToLeaf(this.app.workspace.getLeaf(true), {
						...previousState,
						isNew: false,
					});
					return true;
				}
				return false;
			},
			icon: view.Timeline.ICON,
		});

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file, info) => {
				if (info === "more-options") {
					menu.addItem((item) => {
						item.setSection("view.linked");
						item.setTitle("Open timeline view");
						item.setIcon(view.Timeline.ICON);
						item.onClick(() => {
							openTimelineView(
								this.app.workspace.getLeaf("split", "horizontal"),
								this.app.workspace.getMostRecentLeaf() ?? undefined,
							);
						});
					});
				}
				if (file instanceof obsidian.TFolder && info === "file-explorer-context-menu") {
					menu.addItem((item) => {
						item.setTitle("View as timeline")
							.setIcon(view.Timeline.ICON)
							.onClick(() => {
								openTimelineViewInNewLeaf({
									filterQuery: `path:"${file.path}"`,
								});
							});
					});
				}
			}),
		);

		this.registerDomEvent(window, "auxclick", (event) => {
			if (event.button !== 2) return;
			if (!(event.target instanceof HTMLElement)) return;

			const tagDom = event.target.matchParent("div.tree-item-self.tag-pane-tag.is-clickable");
			if (!(tagDom instanceof HTMLElement)) return;

			const tagLeaf = this.app.workspace.getLeavesOfType("tag").at(0)?.view;

			if (tagLeaf == null) return;
			const tagDomObj = tags.tagDomRecordInTagView(tagLeaf);
			if (tagDomObj == null) return;

			const tag = Object.entries(tagDomObj).find(([_, value]) => value.selfEl === tagDom);
			if (tag == null) return;

			event.preventDefault();
			event.stopPropagation();
			event.stopImmediatePropagation();
			new obsidian.Menu()
				.addItem((item) => {
					item.setTitle("View notes with tag in timeline")
						.setIcon(view.Timeline.ICON)
						.onClick(() => {
							openTimelineViewInNewLeaf({
								filterQuery: `tag:${tag[0]}`,
							});
						});
				})
				.showAtMouseEvent(event);
		});

		this.app.workspace.on("editor-menu", (menu, editor, info) => {
			const pos = editor.getCursor();
			const line = editor.getLine(pos.line);

			const tag = tags.findSurroundingTagInLine(line, pos.ch);
			if (tag == null) return;

			menu.addItem((item) => {
				item.setSection("selection")
					.setTitle("View notes with tag in timeline")
					.setIcon(view.Timeline.ICON)
					.onClick(async () => {
						openTimelineViewInNewLeaf({
							filterQuery: `tag:${tag}`,
						});
					});
			});
		});

		this.registerEvent(
			this.app.workspace.on(
				// @ts-ignore
				"search:results-menu",
				(menu: obsidian.Menu, searchView: SearchView) => {
					menu.addItem((item) => {
						item.setSection("timeline")
							.setTitle("Order results in new timeline view")
							.setIcon(view.Timeline.ICON)
							.onClick(() => {
								openTimelineViewInNewLeaf({
									filterQuery: searchView.searchQuery.query,
								});
							});
					}).addItem((item) => {
						item.setSection("timeline")
							.setTitle("Save as default filter for timeline views")
							.setIcon(view.Timeline.ICON)
							.onClick(async () => {
								const filter = await timelineSettings.noteFilter();
								filter.filterByQuery(searchView.searchQuery.query);
							});
					});
				},
			),
		);

		if (import.meta.env.MODE === "development") {
			if (await this.app.vault.adapter.exists("___reload.md")) {
				await this.app.vault.adapter.remove("___reload.md");
			}

			this.registerEvent(
				this.app.workspace.on("file-open", (file) => {
					if (file?.path === "___reload.md") {
						this.app.vault.adapter.remove(file.path).then(() => location.reload());
					}
				}),
			);
		}
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(view.Timeline.TYPE);
	}
}
