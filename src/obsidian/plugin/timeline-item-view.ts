import {
	FileManager,
	ItemView,
	Menu,
	MetadataCache,
	TFile,
	Vault,
	Workspace,
	WorkspaceLeaf,
	type ViewStateResult,
} from "obsidian";
import { LUCID_ICON, OBSIDIAN_LEAF_VIEW_TYPE } from "./main";
import type { ObsidianNoteRepository } from "src/note/obsidian-repository";
import type { ObsidianNotePropertyRepository } from "src/note/property/obsidian-repository";
import { get, writable } from "svelte/store";
import type { Note } from "src/note";
import { titleEl } from "../ItemVIew";
import { preventOpenFileWhen, workspaceLeafExt } from "../WorkspaceLeaf";
import { writableProperties } from "src/timeline/Persistence";
import NoteTimeline from "../timeline/NoteTimeline.svelte";
import {
	openFileContextMenu,
	openMultipleFileContextMenu,
} from "../FileExporer";
import type { ObsidianNoteTimelineViewModel } from "../timeline/viewModel";
import { openNewLeafFromEvent } from "../Workspace";

export class TimelineItemView extends ItemView {
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
		private fileManager: FileManager,
		private notes: ObsidianNoteRepository,
		private noteProperties: ObsidianNotePropertyRepository,
	) {
		super(leaf);
		this.navigation = false;

		this.initialization = new Promise(resolve => {
			this.completeInitialization = resolve;
		});

		// events
		[
			vault.on("create", file => {
				if (file instanceof TFile) {
					this.component?.addFile(this.notes.getNoteForFile(file));
				}
			}),
			vault.on("rename", (file, oldPath) => {
				if (file instanceof TFile) {
					this.component?.renameFile(
						this.notes.getNoteForFile(file),
						oldPath,
					);
				}
			}),
			metadata.on("changed", file => {
				if (file instanceof TFile) {
					this.component?.modifyFile(this.notes.getNoteForFile(file));
				}
			}),
			vault.on("delete", file => {
				if (file instanceof TFile) {
					this.component?.deleteFile(this.notes.getNoteForFile(file));
				}
			}),
			this.leaf.on("group-change", group => {
				this.group = group;
			}),
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
		].forEach(eventRef => this.registerEvent(eventRef));

		preventOpenFileWhen(
			this,
			() =>
				this.group != null &&
				this.group.length > 0 &&
				this.workspace.getGroupLeaves(this.group).length > 1,
		);
	}

	private $mode: EditMode = EditMode.Edit;
	private mode = writable(this.$mode);

	onPaneMenu(
		menu: Menu,
		source: "more-options" | "tab-header" | string,
	): void {
		if (this.$mode === EditMode.Edit) {
			menu.addItem(item => {
				item.setIcon("book-open")
					.setSection("pane")
					.setTitle("View-only timeline")
					.onClick(() => {
						this.mode.set(EditMode.View);
					});
			});
		} else if (this.$mode === EditMode.View) {
			menu.addItem(item => {
				item.setIcon("edit-3")
					.setSection("pane")
					.setTitle("Edit timeline")
					.onClick(() => {
						this.mode.set(EditMode.Edit);
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

			const persistedMode = viewModel.make(
				"mode",
				this.$mode === EditMode.Edit ? "edit" : "view",
			);
			if (get(persistedMode) === "edit") {
				this.mode.set(EditMode.Edit);
			} else if (get(persistedMode) === "view") {
				this.mode.set(EditMode.View);
			}
			this.mode.subscribe(mode =>
				persistedMode.set(mode === EditMode.Edit ? "edit" : "view"),
			);
			const switchToViewMode = this.addAction(
				"book-open",
				"Current view: editing\nClick to view-only",
				() => this.mode.set(EditMode.View),
			);
			const switchToEditMode = this.addAction(
				"edit-3",
				"Current view: view-only\nClick to edit",
				() => this.mode.set(EditMode.Edit),
			);
			this.mode.subscribe(newMode => {
				this.$mode = newMode;
				switchToViewMode.toggle(newMode === EditMode.Edit);
				switchToEditMode.toggle(newMode === EditMode.View);
			});

			this.component = new NoteTimeline({
				target: content,
				props: {
					noteRepository: this.notes,
					notePropertyRepository: this.noteProperties,
					isNew,
					viewModel,
					oncontextmenu: (e, notes) => {
						if (notes.length === 1) {
							const file = this.notes.getFileFromNote(notes[0]);
							if (!file) return;
							openFileContextMenu(
								e,
								file,
								this.workspace,
								this.fileManager,
							);
						} else if (notes.length > 1) {
							const files = notes
								.map(it => this.notes.getFileFromNote(it))
								.filter(it => it != null);
							if (files.length === 0) return;
							if (files.length === 1)
								openFileContextMenu(
									e,
									files[0],
									this.workspace,
									this.fileManager,
								);
							else
								openMultipleFileContextMenu(
									e,
									files,
									this.workspace,
									this.fileManager,
								);
						}
					},
				},
			});

			this.component.$on("noteSelected", event => {
				const file = this.notes.getFileFromNote(event.detail.note);
				if (!file) return;
				const cause = event.detail.event;
				openNewLeafFromEvent(this.workspace, cause).openFile(file);
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
		this.component?.$destroy();
		return super.onClose();
	}
}

type TimelineItemViewState = {
	isNew?: boolean;
} & ObsidianNoteTimelineViewModel;

const enum EditMode {
	View,
	Edit,
}
