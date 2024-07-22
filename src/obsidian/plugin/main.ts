/// <reference types="vite/client" />
import {
	ItemView,
	Plugin,
	TFile,
	Vault,
	WorkspaceLeaf,
	type ViewStateResult,
	Workspace,
	Keymap,
	MetadataCache,
	Menu,
} from "obsidian";
import { getMetadataTypeManager } from "../MetadataTypeManager";
import { ObsidianNotePropertyRepository } from "src/note/property/obsidian-repository";
import { ObsidianNoteRepository } from "src/note/obsidian-repository";
import { createNewTimeline } from "src/timeline/create";
import NoteTimeline from "../timeline/NoteTimeline.svelte";
import type { Note } from "src/note";
import { writableProperties } from "src/timeline/Persistence";
import { workspaceLeafExt } from "../WorkspaceLeaf";
import { titleEl } from "../ItemVIew";
import type { ObsidianNoteTimelineViewModel } from "../timeline/viewModel";
import { TimelineNoteOrder } from "src/timeline/order/ByNoteProperty";
import { writable } from "svelte/store";

const OBSIDIAN_LEAF_VIEW_TYPE: string = "VIEW_TYPE_TIMELINE_VIEW";
const LUCID_ICON = "waypoints";

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

class TimelineItemView extends ItemView {
	getIcon(): string {
		return LUCID_ICON;
	}

	getViewType(): string {
		return OBSIDIAN_LEAF_VIEW_TYPE;
	}

	private group: string | undefined;

	constructor(
		leaf: WorkspaceLeaf,
		vault: Vault,
		metadata: MetadataCache,
		private workspace: Workspace,
		private notes: ObsidianNoteRepository,
		private noteProperties: ObsidianNotePropertyRepository,
	) {
		super(leaf);
		this.navigation = false;

		this.initialization = new Promise(resolve => {
			this.completeInitialization = resolve;
		});

		this.registerEvent(
			vault.on("create", file => {
				if (file instanceof TFile) {
					this.component?.addFile(this.notes.getNoteForFile(file));
				}
			}),
		);

		this.registerEvent(
			vault.on("rename", (file, oldPath) => {
				if (file instanceof TFile) {
					this.component?.renameFile(
						this.notes.getNoteForFile(file),
						oldPath,
					);
				}
			}),
		);

		this.registerEvent(
			vault.on("modify", file => {
				if (file instanceof TFile) {
					this.component?.modifyFile(this.notes.getNoteForFile(file));
				}
			}),
		);

		this.registerEvent(
			metadata.on("changed", file => {
				if (file instanceof TFile) {
					this.component?.modifyFile(this.notes.getNoteForFile(file));
				}
			}),
		);

		this.registerEvent(
			vault.on("delete", file => {
				if (file instanceof TFile) {
					this.component?.deleteFile(this.notes.getNoteForFile(file));
				}
			}),
		);

		this.registerEvent(
			this.leaf.on("group-change", group => {
				this.group = group;
			}),
		);

		const openFile = this.leaf.openFile.bind(this.leaf);
		this.leaf.openFile = async (file, openState) => {
			if (!this.group) {
				openFile(file, openState);
				return;
			}

			const leavesInGroup = this.workspace.getGroupLeaves(this.group);
			if (leavesInGroup.length === 1) {
				openFile(file, openState);
				return;
			}
		};

		this.registerEvent(
			this.workspace.on("active-leaf-change", activeLeaf => {
				if (activeLeaf === this.leaf || !activeLeaf) {
					return;
				}
				if (!this.group) {
					return;
				}

				const state = activeLeaf.getViewState().state;
				if (!state) {
					return;
				}

				if (!("file" in state) || typeof state.file !== "string") {
					return;
				}

				const leavesInGroup = this.workspace.getGroupLeaves(this.group);
				if (!leavesInGroup.includes(activeLeaf)) {
					return;
				}

				const file = vault.getAbstractFileByPath(state.file);
				if (file instanceof TFile) {
					const note = this.notes.getNoteForFile(file);
					if (!note) {
						return;
					}
					this.component?.focusOnNote(note);
				}
			}),
		);
	}

	private $mode: "view" | "edit" = "edit";
	private mode = writable(this.$mode);

	onPaneMenu(
		menu: Menu,
		source: "more-options" | "tab-header" | string,
	): void {
		if (this.$mode === "edit") {
			menu.addItem(item => {
				item.setIcon("book-open")
					.setSection("pane")
					.setTitle("View-only timeline")
					.onClick(() => {
						this.mode.set("view");
					});
			});
		} else if (this.$mode === "view") {
			menu.addItem(item => {
				item.setIcon("edit-3")
					.setSection("pane")
					.setTitle("Edit timeline")
					.onClick(() => {
						this.mode.set("edit");
					});
			});
		}
		menu.addItem(item => {
			item.setIcon("link")
				.setSection("view.linked")
				.setTitle("Open linked markdown tab")
				.onClick(() => {
					this.workspace.getLeaf("split", "horizontal").setViewState({
						type: "empty",
						group: this.leaf,
					});
				});
		});
		return super.onPaneMenu(menu, source);
	}

	private openNoteInLinkedLeaf(note: Note): boolean {
		if (!this.group) {
			return false;
		}
		const leavesInGroup = this.workspace.getGroupLeaves(this.group);
		if (leavesInGroup.length === 1) {
			return false;
		}

		const file = this.notes.getFileFromNote(note);
		if (!file) {
			return false;
		}
		leavesInGroup.forEach(leaf => {
			if (leaf === this.leaf) return;
			leaf.openFile(file);
		});
		return true;
	}

	private computeDisplayText() {
		const query = this.state?.settings?.filter?.query ?? "";
		if (query !== "") {
			return `Timeline view - ${query}`;
		}
		return "Timeline view";
	}
	#displayText = this.computeDisplayText();
	private get displayText() {
		return this.#displayText;
	}
	private set displayText(value: string) {
		if (this.#displayText !== value) {
			this.#displayText = value;

			titleEl(this)?.setText?.(value);

			// the leaf pulls its text from the title, so just have it update
			workspaceLeafExt(this.leaf)?.updateHeader();
		}
	}

	getDisplayText(): string {
		return this.displayText;
	}

	private component: NoteTimeline | null = null;
	private initialization?: Promise<TimelineItemViewState>;
	private completeInitialization(_state: TimelineItemViewState) {}

	private state: TimelineItemViewState | undefined;
	setState(state: unknown, result: ViewStateResult): Promise<void> {
		this.state = state as TimelineItemViewState;
		this.completeInitialization(this.state);
		return super.setState(state, result);
	}

	getState() {
		return this.state;
	}

	protected async onOpen(): Promise<void> {
		const content = this.containerEl.children[1];

		content.createEl("progress");

		this.initialization?.then(state => {
			delete this.initialization;
			content.empty();
			content.setAttribute(
				"style",
				"padding:0;position: relative;overflow-x:hidden;overflow-y:hidden",
			);

			const isNew = state.isNew;
			delete state.isNew;

			const viewModel = writableProperties(state, (key, newValue) => {
				state[key] = newValue;
				this.displayText = this.computeDisplayText();
				this.workspace.requestSaveLayout();
			});

			this.mode = viewModel.make("mode", this.$mode);
			const switchToViewMode = this.addAction(
				"book-open",
				"Current view: editing\nClick to view-only",
				() => this.mode.set("view"),
			);
			const switchToEditMode = this.addAction(
				"edit-3",
				"Current view: view-only\nClick to edit",
				() => this.mode.set("edit"),
			);
			this.mode.subscribe(newMode => {
				this.$mode = newMode;
				switchToViewMode.toggle(newMode === "edit");
				switchToEditMode.toggle(newMode === "view");
			});

			this.component = new NoteTimeline({
				target: content,
				props: {
					noteRepository: this.notes,
					notePropertyRepository: this.noteProperties,
					isNew,
					viewModel,
				},
			});

			this.component.$on("noteSelected", event => {
				const file = this.notes.getFileFromNote(event.detail.note);
				if (!file) return;
				const cause = event.detail.event;
				let newLeaf: WorkspaceLeaf;
				if (
					cause instanceof MouseEvent ||
					cause instanceof KeyboardEvent
				) {
					newLeaf = this.workspace.getLeaf(Keymap.isModEvent(cause));
				} else {
					newLeaf = this.workspace.getLeaf(true);
				}
				newLeaf.openFile(file);
			});

			this.component?.$on("noteFocused", event => {
				if (event.detail) {
					this.openNoteInLinkedLeaf(event.detail);
				}
			});

			this.component?.$on("createNote", async event => {
				const note = await this.notes.createNote(event.detail);
				if (!this.openNoteInLinkedLeaf(note)) {
					const file = this.notes.getFileFromNote(note);
					if (!file) return;
					this.workspace.getLeaf(true).openFile(file);
				}
			});

			this.component?.$on("modifyNote", async event => {
				const note = event.detail.note;
				if ("created" in event.detail.modification) {
					await this.notes.modifyNote(note, {
						created: event.detail.modification.created,
					});
				} else if ("modified" in event.detail.modification) {
					await this.notes.modifyNote(note, {
						modified: event.detail.modification.modified,
					});
				} else {
					await this.notes.modifyNote(note, {
						property: {
							[event.detail.modification.property.name]:
								event.detail.modification.property.value,
						},
					});
				}
			});
		});
	}

	protected onClose(): Promise<void> {
		this.leaf.openFile = WorkspaceLeaf.prototype.openFile;
		this.component?.$destroy();
		return super.onClose();
	}
}

type TimelineItemViewState = {
	isNew?: boolean;
} & ObsidianNoteTimelineViewModel;
