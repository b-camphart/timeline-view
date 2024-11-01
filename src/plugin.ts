/// <reference types="vite/client" />
import obsidian from "obsidian";
import * as MetadataTypeManager from "src/obsidian/MetadataTypeManager";
import * as property from "src/note/property";
import * as note from "src/note";
import * as createTimeline from "src/timeline/create";
import * as view from "src/view";
import * as settings from "src/settings";
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
	#readPropertyTypes = () => {
		const path = obsidian.normalizePath(`${this.app.vault.configDir}/types.json`);
		return this.app.vault.adapter.read(path);
	};

	#getMetadataTypeManager = () => MetadataTypeManager.getMetadataTypeManager(this.app);

	#notes: note.ObsidianRepository = new note.ObsidianRepository(
		this.app.vault,
		this.app.metadataCache,
		this.app.fileManager,
	);
	#properties: property.ObsidianRepository = new property.ObsidianRepository(
		this.#readPropertyTypes,
		this.#getMetadataTypeManager,
	);
	#settingsTab: settings.ObsidianSettingsTab = new settings.ObsidianSettingsTab(
		this.app,
		this,
		this.#properties,
		this.#notes,
	);

	async #createNewTimelineWith(init: { filterQuery?: string }): Promise<view.TimelineItemViewState> {
		const sorter = (await this.#settingsTab.noteOrder()).selectedProperty();
		const filter = await this.#settingsTab.noteFilter(init.filterQuery);
		const groups = await this.#settingsTab.groups();
		const timeline = await createTimeline.createNewTimeline(this.#notes, sorter, filter.noteFilter());

		return {
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
		};
	}

	async #createNewTimeline() {
		return this.#createNewTimelineWith({});
	}

	async #openNewTimelineViewWith(state: { filterQuery?: string }) {
		assignTimelineViewToLeaf(this.app.workspace.getLeaf(true), await this.#createNewTimelineWith(state));
	}

	async #openNewTimelineView() {
		this.#openNewTimelineViewWith({});
	}

	#reopenTimelineView(state: view.TimelineItemViewState) {
		assignTimelineViewToLeaf(this.app.workspace.getLeaf(true), {
			...state,
			isNew: false,
		});
	}

	async onload(): Promise<void> {
		this.registerView(view.Timeline.TYPE, view.Timeline.registration(this.#notes, this.#properties));

		const openNewTimelineView = this.#openNewTimelineView.bind(this);
		const openNewTimelineViewWith = this.#openNewTimelineViewWith.bind(this);
		const reopenTimelineView = this.#reopenTimelineView.bind(this);

		const ribbonIcon = new RibbonIcon(openNewTimelineView, reopenTimelineView, this.#settingsTab);
		ribbonIcon.addToPlugin(this);

		this.addCommand({
			id: "open-timeline-view",
			name: "Open timeline view",
			icon: view.Timeline.ICON,
			callback: openNewTimelineView,
		});
		this.addCommand({
			id: "reopen-timeline-view",
			name: "Re-open timeline view",
			icon: view.Timeline.ICON,
			checkCallback: (checking) => {
				const previousState = view.Timeline.getPreviouslyClosedState();
				if (previousState === null) return false;
				if (checking) return true;
				reopenTimelineView(previousState);
			},
		});
		this.app.workspace.onLayoutReady(() => {
			this.addSettingTab(this.#settingsTab);

			this.registerEvent(
				this.app.workspace.on("file-menu", (menu, _file, info) => {
					if (info === "more-options") {
						menu.addItem((item) => {
							item.setSection("view.linked");
							item.setTitle("Open timeline view");
							item.setIcon(view.Timeline.ICON);
							item.onClick(async () => {
								assignTimelineViewToLeaf(
									this.app.workspace.getLeaf("split", "horizontal"),
									await this.#createNewTimeline(),
									this.app.workspace.getMostRecentLeaf() ?? undefined,
								);
							});
						});
					}
				}),
			);
			this.registerEvent(
				this.app.workspace.on("file-menu", (menu, file, info) => {
					if (file instanceof obsidian.TFolder && info === "file-explorer-context-menu") {
						menu.addItem((item) => {
							item.setTitle("View as timeline")
								.setIcon(view.Timeline.ICON)
								.onClick(() => {
									openNewTimelineViewWith({
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
								openNewTimelineViewWith({
									filterQuery: `tag:${tag[0]}`,
								});
							});
					})
					.showAtMouseEvent(event);
			});

			this.registerEvent(
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
								openNewTimelineViewWith({
									filterQuery: `tag:${tag}`,
								});
							});
					});
				}),
			);

			this.registerEvent(
				this.app.workspace.on(
					// @ts-expect-error
					"search:results-menu",
					(menu: obsidian.Menu, searchView: SearchView) => {
						menu.addItem((item) => {
							item.setSection("timeline")
								.setTitle("Order results in new timeline view")
								.setIcon(view.Timeline.ICON)
								.onClick(() => {
									openNewTimelineViewWith({
										filterQuery: searchView.searchQuery.query,
									});
								});
						}).addItem((item) => {
							item.setSection("timeline")
								.setTitle("Save as default filter for timeline views")
								.setIcon(view.Timeline.ICON)
								.onClick(async () => {
									const filter = await this.#settingsTab.noteFilter();
									filter.filterByQuery(searchView.searchQuery.query);
								});
						});
					},
				),
			);
		});

		if (import.meta.env.MODE === "development") {
			const reload = async () => {
				//@ts-expect-error
				this.app.workspace.unregisterObsidianProtocolHandler("reload", reload);

				//@ts-expect-error
				this.app.plugins.disablePlugin(this.manifest.id);
				console.debug("disabled", this.manifest.id);

				const oldDebug = localStorage.getItem("debug-plugin");
				localStorage.setItem("debug-plugin", "1");
				try {
					//@ts-expect-error
					await this.app.plugins.enablePlugin(this.manifest.id);
				} finally {
					if (oldDebug === null) {
						localStorage.removeItem("debug-plugin");
					} else {
						localStorage.setItem("debug-plugin", oldDebug);
					}
				}
				console.debug("enabled", this.manifest.id);
				new obsidian.Notice(`Reloaded plugin`);
			};
			//@ts-expect-error
			this.app.workspace.registerObsidianProtocolHandler("reload", reload);
		}
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(view.Timeline.TYPE);
	}
}

class RibbonIcon {
	#openNewTimelineView: () => void;
	#reopenTimelineView: (state: view.TimelineItemViewState) => void;
	#settings;
	constructor(
		openNewTimelineView: () => void,
		reopenTimelineView: (state: view.TimelineItemViewState) => void,
		settings: {
			usePreviousState(): boolean;
		},
	) {
		this.#openNewTimelineView = openNewTimelineView;
		this.#reopenTimelineView = reopenTimelineView;
		this.#settings = settings;
	}

	#onMouseDown(event: MouseEvent) {
		const previousState = view.Timeline.getPreviouslyClosedState();
		if (event.button === 2) {
			const menu = new obsidian.Menu().addItem((item) => {
				item.setTitle("Open new timeline view").onClick(this.#openNewTimelineView);
			});
			if (previousState != null) {
				menu.addItem((item) => {
					item.setTitle("Re-open closed timeline view").onClick(() => {
						this.#reopenTimelineView(previousState);
					});
				});
			}
			menu.showAtMouseEvent(event);
		} else {
			if (this.#settings.usePreviousState() && previousState !== null) {
				this.#reopenTimelineView(previousState);
			} else {
				this.#openNewTimelineView();
			}
		}
	}

	addToPlugin(plugin: obsidian.Plugin) {
		plugin.addRibbonIcon(view.Timeline.ICON, "Open timeline view", this.#onMouseDown.bind(this));
	}
}
