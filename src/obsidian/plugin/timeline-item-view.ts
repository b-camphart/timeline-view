import * as obsidian from "obsidian";
import type { ObsidianNoteRepository } from "src/note/obsidian-repository";
import type { ObsidianNotePropertyRepository } from "src/note/property/obsidian-repository";
import { get, writable } from "svelte/store";
import { titleEl } from "../ItemVIew";
import { workspaceLeafExt } from "../WorkspaceLeaf";
import { writableProperties } from "src/timeline/Persistence";
import NoteTimeline from "src/timeline/NoteTimeline.svelte";
import {
	openFileContextMenu,
	openMultipleFileContextMenu,
} from "../FileExporer";
import { openNewLeafFromEvent } from "../Workspace";
import { exists } from "src/utils/null";
import * as json from "src/utils/json";
import { openModal } from "src/obsidian/view/Modal";
import { mount, unmount } from "svelte";

export class TimelineItemView extends obsidian.ItemView {
	static readonly #ICON = "waypoints";
	static get ICON() {
		return this.#ICON;
	}

	getIcon(): string {
		return TimelineItemView.ICON;
	}

	static readonly #TYPE = "VIEW_TYPE_TIMELINE_VIEW";
	static get TYPE() {
		return this.#TYPE;
	}

	getViewType(): string {
		return TimelineItemView.TYPE;
	}

	constructor(
		leaf: obsidian.WorkspaceLeaf,
		vault: obsidian.Vault,
		metadata: obsidian.MetadataCache,
		private workspace: obsidian.Workspace,
		private fileManager: obsidian.FileManager,
		private notes: ObsidianNoteRepository,
		private noteProperties: ObsidianNotePropertyRepository
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
			vault.on("create", (file) => {
				if (file instanceof obsidian.TFile) {
					this.component?.addFile(this.notes.getNoteForFile(file));
				}
			}),
			vault.on("rename", (file, oldPath) => {
				if (file instanceof obsidian.TFile) {
					this.component?.renameFile(
						this.notes.getNoteForFile(file),
						oldPath
					);
				}
			}),
			metadata.on("changed", (file) => {
				if (file instanceof obsidian.TFile) {
					this.component?.modifyFile(this.notes.getNoteForFile(file));
				}
			}),
			vault.on("delete", (file) => {
				if (file instanceof obsidian.TFile) {
					this.component?.deleteFile(this.notes.getNoteForFile(file));
				}
			}),
			this.workspace.on("active-leaf-change", (activeLeaf) => {
				if (activeLeaf === this.leaf || !activeLeaf) {
					return;
				}

				if (this.leaf.isDeferred) return;

				const state = activeLeaf.getViewState().state;
				if (!state) {
					return;
				}

				if (!("file" in state) || typeof state.file !== "string") {
					return;
				}

				const file = vault.getAbstractFileByPath(state.file);
				if (file instanceof obsidian.TFile) {
					this.showFile(file);
				}
			}),
		].forEach((eventRef) => this.registerEvent(eventRef));
	}

	showFile(file: obsidian.TFile) {
		const note = this.notes.getNoteForFile(file);
		if (!note) {
			return;
		}
		this.component?.focusOnNote(note);
	}

	private $mode: EditMode = EditMode.Edit;
	private mode = writable(this.$mode);

	onPaneMenu(
		menu: obsidian.Menu,
		source: "more-options" | "tab-header" | string
	): void {
		super.onPaneMenu(menu, source);
		menu.addItem((item) => {
			item.setIcon("book-open")
				.setChecked(this.$mode === EditMode.View)
				.setSection("pane")
				.setTitle("View-only timeline")
				.onClick(() => {
					this.mode.set(
						this.$mode === EditMode.View
							? EditMode.Edit
							: EditMode.View
					);
				});
		});
	}

	private computeDisplayText() {
		const property = this.state?.settings?.property?.property ?? "";
		const secondaryProperty =
			this.state?.settings?.property?.secondaryProperty;
		const query = this.state?.settings?.filter?.query ?? "";

		const prefix = `Timeline view [${property}] `;
		const queryDisplay = query !== "" ? ` (filter: ${query})` : "";

		if (secondaryProperty != null && secondaryProperty.inUse) {
			if (secondaryProperty.useAs === "length") {
				return (
					`${prefix}[length: ${secondaryProperty.name}]` +
					queryDisplay
				);
			} else {
				return `${prefix}→ [${secondaryProperty.name}]` + queryDisplay;
			}
		} else {
			return prefix + queryDisplay;
		}
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
	private initialization?: Promise<TimelineItemViewState>;
	private completeInitialization(_state: TimelineItemViewState) {}

	private state: TimelineItemViewState | undefined;
	setState(state: unknown, result: obsidian.ViewStateResult): Promise<void> {
		this.state = timelineItemViewStateSchema.parseOrDefault(state);
		this.displayText = this.computeDisplayText();
		this.completeInitialization(this.state);
		return super.setState(state, result);
	}

	#getState(): Omit<TimelineItemViewState, "isNew"> | undefined {
		if (this.state != null && "isNew" in this.state) {
			delete this.state.isNew;
		}
		return this.state;
	}

	getState(): Record<string, unknown> {
		return this.#getState() ?? {};
	}

	protected async onOpen(): Promise<void> {
		const content = this.contentEl;

		content.createEl("progress");

		this.initialization?.then((state) => {
			delete this.initialization;
			content.empty();
			content.setAttribute(
				"style",
				"padding:0;position: relative;overflow-x:hidden;overflow-y:hidden"
			);

			const isNew = state.isNew;

			const viewModel = writableProperties(state, (key, newValue) => {
				state[key] = newValue;
				this.displayText = this.computeDisplayText();
				this.workspace.requestSaveLayout();
			});

			const persistedMode = viewModel.make("mode", this.$mode);
			if (get(persistedMode) === "edit") {
				this.mode.set(EditMode.Edit);
			} else if (get(persistedMode) === "view") {
				this.mode.set(EditMode.View);
			}
			this.mode.subscribe((mode) => persistedMode.set(mode));
			const switchToViewMode = this.addAction(
				"book-open",
				"Current view: editing\nClick to view-only",
				() => this.mode.set(EditMode.View)
			);
			const switchToEditMode = this.addAction(
				"edit-3",
				"Current view: view-only\nClick to edit",
				() => this.mode.set(EditMode.Edit)
			);
			this.mode.subscribe((newMode) => {
				this.$mode = newMode;
				switchToViewMode.toggle(newMode === EditMode.Edit);
				switchToEditMode.toggle(newMode === EditMode.View);
			});

			type Events<T extends {}> = {
				[K in keyof T]: (event: T[K]) => void;
			};

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
							openFileContextMenu(
								e,
								file,
								this.workspace,
								this.fileManager
							);
						} else if (notes.length > 1) {
							const files: obsidian.TFile[] = notes
								.map((it) => this.notes.getFileFromNote(it))
								.filter(exists);
							if (files.length === 0) return;
							if (files.length === 1)
								openFileContextMenu(
									e,
									files[0],
									this.workspace,
									this.fileManager
								);
							else
								openMultipleFileContextMenu(
									e,
									files,
									this.workspace,
									this.fileManager
								);
						}
					},
					openModal: (open) => {
						openModal(this.app, open);
					},
					onCreateNote: async (details, cause) => {
						const note = await this.notes.createNote(details);
						const file = this.notes.getFileFromNote(note);

						if (file) {
							setTimeout(() => {
								openNewLeafFromEvent(
									this.workspace,
									cause
								).openFile(file);
							}, 250);
						}
						return note;
					},
					onResizeNotes: async (mods) => {
						await Promise.all(
							mods.map((mod) =>
								this.notes.modifyNote(mod.note, mod)
							)
						);
					},
				},
				events: {
					noteSelected: (event) => {
						const file = this.notes.getFileFromNote(
							event.detail.note
						);
						if (!file) return;
						const cause = event.detail.event;
						openNewLeafFromEvent(this.workspace, cause).openFile(
							file
						);
					},
					noteFocused: (event) => {},
				} satisfies Events<NoteTimeline["$$events_def"]>,
			});
		});
	}

	private static closedState?: Omit<TimelineItemViewState, "isNew">;
	static hasClosedState() {
		return !!this.closedState;
	}
	static getPreviouslyClosedState() {
		return this.closedState;
	}

	protected onClose(): Promise<void> {
		TimelineItemView.closedState = this.#getState();
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
	isNew: json.optional(json.expectBoolean(false)),
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
			secondaryProperty: json.expectObject({
				name: json.expectString("created"),
				inUse: json.expectBoolean(false),
				useAs: json.expectEnum(
					{ length: "length" as const, end: "end" as const },
					"length"
				),
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
				})
			),
		}),
		display: json.expectObject({
			collapsed: json.expectBoolean(true),
			names: json.expectBoolean(false),
		}),
	}),
});

export type TimelineItemViewState = json.Parsed<
	typeof timelineItemViewStateSchema
>;
