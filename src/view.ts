import obsidian from "obsidian";
import type * as note from "src/note";
import type * as property from "src/note/property";
import { get, writable } from "svelte/store";
import type { Note } from "src/note";
import { titleEl } from "src/obsidian/ItemVIew";
import { preventOpenFileWhen, workspaceLeafExt } from "src/obsidian/WorkspaceLeaf";
import { writableProperties } from "src/timeline/Persistence";
import NoteTimeline from "./obsidian/timeline/NoteTimeline.svelte";
import { openFileContextMenu, openMultipleFileContextMenu } from "src/obsidian/FileExporer";
import { openNewLeafFromEvent } from "src/obsidian/Workspace";
import { exists } from "src/utils/null";
import * as json from "src/utils/json";
import { openModal } from "src/obsidian/view/Modal";
import { mount, unmount } from "svelte";

const OBSIDIAN_LEAF_VIEW_TYPE = "VIEW_TYPE_TIMELINE_VIEW";
const LUCID_ICON = "waypoints";

export class Timeline extends obsidian.ItemView {
	static get TYPE() {
		return OBSIDIAN_LEAF_VIEW_TYPE;
	}

	static get ICON() {
		return LUCID_ICON;
	}

	static registration(notes: note.ObsidianRepository, properties: property.ObsidianRepository) {
		return (leaf: obsidian.WorkspaceLeaf) => {
			return new Timeline(leaf, notes, properties);
		};
	}

	getIcon(): string {
		return LUCID_ICON;
	}

	getViewType(): string {
		return OBSIDIAN_LEAF_VIEW_TYPE;
	}

	private group: string = "";

	constructor(
		leaf: obsidian.WorkspaceLeaf,
		private notes: note.ObsidianRepository,
		private noteProperties: property.ObsidianRepository,
	) {
		super(leaf);
		this.navigation = true;

		this.scope = new obsidian.Scope(this.app.scope);
		this.scope.register(["Shift"], " ", () => {
			this.component?.zoomToFit();
		});

		this.initialization = new Promise((resolve) => {
			this.completeInitialization = resolve;
		});

		// events
		[
			this.app.vault.on("rename", (file, oldPath) => {
				if (file instanceof obsidian.TFile) {
					this.component?.renameFile(this.notes.getNoteForFile(file), oldPath);
				}
			}),
			this.app.metadataCache.on("changed", (file) => {
				if (file instanceof obsidian.TFile) {
					this.component?.modifyFile(this.notes.getNoteForFile(file));
				}
			}),
			this.app.vault.on("delete", (file) => {
				if (file instanceof obsidian.TFile) {
					this.component?.deleteFile(this.notes.getNoteForFile(file));
				}
			}),
			this.leaf.on("group-change", (group) => {
				this.group = group;
			}),
			this.app.workspace.on("active-leaf-change", (activeLeaf) => {
				if (activeLeaf === this.leaf || !activeLeaf) {
					return;
				}
				if (this.group === "") {
					return;
				}

				const state = activeLeaf.getViewState().state;
				if (!state) {
					return;
				}

				if (!("file" in state) || typeof state.file !== "string") {
					return;
				}

				const leavesInGroup = this.app.workspace.getGroupLeaves(this.group);
				if (!leavesInGroup.includes(activeLeaf)) {
					return;
				}

				const file = this.app.vault.getAbstractFileByPath(state.file);
				if (file instanceof obsidian.TFile) {
					const note = this.notes.getNoteForFile(file);
					if (!note) {
						return;
					}
					this.component?.focusOnNote(note);
				}
			}),
		].forEach((eventRef) => this.registerEvent(eventRef));
		this.app.workspace.onLayoutReady(() => {
			this.registerEvent(
				this.app.vault.on("create", (file) => {
					if (file instanceof obsidian.TFile) {
						this.component?.addFile(this.notes.getNoteForFile(file));
					}
				}),
			);
		});
		preventOpenFileWhen(
			this,
			() =>
				this.group != null && this.group.length > 0 && this.app.workspace.getGroupLeaves(this.group).length > 1,
		);
	}

	private $mode: EditMode = EditMode.Edit;
	private mode = writable(this.$mode);

	onPaneMenu(menu: obsidian.Menu, source: "more-options" | "tab-header" | string): void {
		if (this.$mode === EditMode.Edit) {
			menu.addItem((item) => {
				item.setIcon("book-open")
					.setSection("pane")
					.setTitle("View-only timeline")
					.onClick(() => {
						this.mode.set(EditMode.View);
					});
			});
		} else if (this.$mode === EditMode.View) {
			menu.addItem((item) => {
				item.setIcon("edit-3")
					.setSection("pane")
					.setTitle("Edit timeline")
					.onClick(() => {
						this.mode.set(EditMode.Edit);
					});
			});
		}
		menu.addItem((item) => {
			item.setIcon("link")
				.setSection("view.linked")
				.setTitle("Open linked markdown tab")
				.onClick(() => {
					this.app.workspace.getLeaf("split", "horizontal").setViewState({
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
		const leavesInGroup = this.app.workspace.getGroupLeaves(this.group);
		if (leavesInGroup.length === 1) {
			return false;
		}

		const file = this.notes.getFileFromNote(note);
		if (!file) {
			return false;
		}
		leavesInGroup.forEach((leaf) => {
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

	private component: ReturnType<typeof NoteTimeline> | null = null;
	private initialization?: Promise<TimelineItemViewState & { isNew?: boolean }>;
	private completeInitialization(_state: TimelineItemViewState & { isNew?: boolean }) {}

	private state: null | (TimelineItemViewState & { isNew?: boolean }) = null;
	setState(state: unknown, _result: obsidian.ViewStateResult): Promise<void> {
		this.state = timelineItemViewStateSchema.parseOrDefault(state);
		if (typeof state === "object" && state !== null && "isNew" in state && state.isNew) {
			this.state.isNew = true;
		}
		this.displayText = this.computeDisplayText();
		this.completeInitialization(this.state);
		return Promise.resolve();
	}

	private static readonly UNINITIALIZED = { s: Symbol() } as const;
	getState(): TimelineItemViewState | typeof Timeline.UNINITIALIZED {
		if (this.state !== null && "isNew" in this.state) {
			delete this.state.isNew;
		}
		return this.state ?? Timeline.UNINITIALIZED;
	}

	protected async onOpen(): Promise<void> {
		const content = this.containerEl.children[1];

		content.createEl("progress");

		this.initialization?.then((state) => {
			delete this.initialization;
			content.empty();
			content.setAttribute("style", "padding:0;position: relative;overflow-x:hidden;overflow-y:hidden");

			const isNew = state.isNew;

			const viewModel = writableProperties(state, (key, newValue) => {
				state[key] = newValue;
				this.displayText = this.computeDisplayText();
				this.app.workspace.requestSaveLayout();
			});

			const persistedMode = viewModel.make("mode", this.$mode);
			if (get(persistedMode) === "edit") {
				this.mode.set(EditMode.Edit);
			} else if (get(persistedMode) === "view") {
				this.mode.set(EditMode.View);
			}
			this.mode.subscribe((mode) => persistedMode.set(mode));
			const switchToViewMode = this.addAction("book-open", "Current view: editing\nClick to view-only", () =>
				this.mode.set(EditMode.View),
			);
			const switchToEditMode = this.addAction("edit-3", "Current view: view-only\nClick to edit", () =>
				this.mode.set(EditMode.Edit),
			);
			this.mode.subscribe((newMode) => {
				this.$mode = newMode;
				switchToViewMode.toggle(newMode === EditMode.Edit);
				switchToEditMode.toggle(newMode === EditMode.View);
			});

			this.component = mount(NoteTimeline, {
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
							openFileContextMenu(e, file, this.app.workspace, this.app.fileManager);
						} else if (notes.length > 1) {
							const files: obsidian.TFile[] = notes
								.map((it) => this.notes.getFileFromNote(it))
								.filter(exists);
							if (files.length === 0) return;
							if (files.length === 1)
								openFileContextMenu(e, files[0], this.app.workspace, this.app.fileManager);
							else openMultipleFileContextMenu(e, files, this.app.workspace, this.app.fileManager);
						}
					},
					openModal: (open) => {
						openModal(this.app, open);
					},
					onNoteSelected: (note, cause) => {
						const file = this.notes.getFileFromNote(note);
						if (!file) return;
						openNewLeafFromEvent(this.app.workspace, cause).openFile(file);
					},
					onNoteFocused: (note) => {
						this.openNoteInLinkedLeaf(note);
					},
					onCreateNote: async (creation) => {
						const note = await this.notes.createNote(creation);
						if (!this.openNoteInLinkedLeaf(note)) {
							const file = this.notes.getFileFromNote(note);
							if (!file) return;
							this.app.workspace.getLeaf(true).openFile(file);
						}
					},
					onModifyNote: (note, modification) => {
						if ("created" in modification) {
							this.notes.modifyNote(note, {
								created: modification.created,
							});
						} else if ("modified" in modification) {
							this.notes.modifyNote(note, {
								modified: modification.modified,
							});
						} else {
							this.notes.modifyNote(note, {
								property: {
									[modification.property.name]: modification.property.value,
								},
							});
						}
						return true;
					},
				},
			});
		});
	}

	private static closedState: TimelineItemViewState | null = null;
	static hasClosedState() {
		return this.closedState !== null;
	}
	static getPreviouslyClosedState() {
		return this.closedState;
	}

	protected onClose(): Promise<void> {
		const state = this.getState();
		if (state !== Timeline.UNINITIALIZED) {
			Timeline.closedState = state as TimelineItemViewState;
		}
		if (this.component !== null) {
			unmount(this.component);
		}
		return super.onClose();
	}
}

enum EditMode {
	View = "view",
	Edit = "edit",
}

const timelineItemViewStateSchema = json.expectObject({
	focalValue: json.expectNumber(0),
	vScroll: json.expectNumber(0),
	mode: json.expectEnum(EditMode, EditMode.Edit),
	scale: json.expectNumber(1),
	settings: json.expectObject({
		isOpen: json.expectBoolean(false),
		property: json.expectObject({
			collapsed: json.expectBoolean(true),
			property: json.expectString("created"),
			propertiesUseWholeNumbers: json.expectRecord({
				key: json.expectString(""),
				value: json.expectBoolean(true),
			}),
		}),
		filter: json.expectObject({
			collapsed: json.expectBoolean(true),
			query: json.expectString(""),
		}),
		groups: json.expectObject({
			collapsed: json.expectBoolean(true),
			groups: json.expectArray(
				json.expectObject({
					query: json.expectString(""),
					color: json.expectString(""),
				}),
			),
		}),
		display: json.expectObject({
			collapsed: json.expectBoolean(true),
			names: json.expectBoolean(false),
		}),
	}),
});

export type TimelineItemViewState = json.Parsed<typeof timelineItemViewStateSchema>;
