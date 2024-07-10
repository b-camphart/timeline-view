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
} from "obsidian";
import { getMetadataTypeManager } from "../MetadataTypeManager";
import { ObsidianNotePropertyRepository } from "src/note/property/obsidian-repository";
import { ObsidianNoteRepository } from "src/note/obsidian-repository";
import { NoteProperty } from "src/note/property";
import { createNewTimeline } from "src/timeline/create";
import NoteTimeline from "../timeline/NoteTimeline.svelte";
import { NoPropertySelector } from "../timeline/settings/property/NotePropertySelector";
import { TimelineFileItem } from "../timeline/TimelineFileItem";
import type { Note } from "src/note";
import { writableProperties } from "src/timeline/Persistence";

const OBSIDIAN_LEAF_VIEW_TYPE: string = "VIEW_TYPE_TIMELINE_VIEW";
const LUCID_ICON = "waypoints";

export default class ObsidianTimelinePlugin extends Plugin {
	async onload(): Promise<void> {
		const notes = new ObsidianNoteRepository(
			this.app.vault,
			this.app.metadataCache,
		);
		const properties = new ObsidianNotePropertyRepository(
			this.app.vault.adapter,
			() => getMetadataTypeManager(this.app),
		);

		const openTimelineView = async () => {
			const timeline = await createNewTimeline(
				notes,
				NoteProperty.Created,
			);
			const leaf = this.app.workspace.getLeaf(true);
			leaf.setViewState({
				type: OBSIDIAN_LEAF_VIEW_TYPE,
				active: true,
				state: {
					focalValue: timeline.focalValue,
					isNew: true,
				},
			});
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
			openTimelineView(),
		);
		this.addCommand({
			id: "open-timeline-view",
			name: "Open timeline view",
			callback: () => openTimelineView(),
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
}

class TimelineItemView extends ItemView {
	getIcon(): string {
		return LUCID_ICON;
	}

	getViewType(): string {
		return OBSIDIAN_LEAF_VIEW_TYPE;
	}

	constructor(
		leaf: WorkspaceLeaf,
		vault: Vault,
		metadata: MetadataCache,
		private workspace: Workspace,
		private notes: ObsidianNoteRepository,
		private noteProperties: ObsidianNotePropertyRepository,
	) {
		super(leaf);
		this.navigation = true; // hide status bar
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
	}

	private computeDisplayText() {
		if ((this.state?.settings?.filter?.query ?? "") !== "") {
			return `Timeline view - ${this.state.settings!.filter!.query}`;
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

			// unofficial obsidian api to change the title
			(this as any).titleEl.setText(value);

			// the leaf pulls its text from the title, so just have it update
			(this.leaf as any).updateHeader();
		}
	}

	getDisplayText(): string {
		return this.displayText;
	}

	private component: NoteTimeline | null = null;
	private initialization?: Promise<void>;
	private completeInitialization() {}

	private state: any;
	setState(state: any, result: ViewStateResult): Promise<void> {
		this.state = state;
		this.completeInitialization();
		return super.setState(state, result);
	}

	getState() {
		return this.state;
	}

	protected async onOpen(): Promise<void> {
		const content = this.containerEl.children[1];

		content.createEl("progress");

		const propertySelection = {
			selector: NoPropertySelector,
			selectProperty(note: Note) {
				return this.selector.selectProperty(note);
			},
		};

		const notes: Map<string, TimelineFileItem> = new Map();
		for (const note of await this.notes.listAll()) {
			notes.set(note.id(), new TimelineFileItem(note, propertySelection));
		}

		this.initialization?.then(() => {
			delete this.initialization;
			content.empty();
			content.setAttribute(
				"style",
				"padding:0;position: relative;overflow-x:hidden;overflow-y:hidden",
			);

			const isNew = this.state.isNew;
			delete this.state.isNew;

			this.component = new NoteTimeline({
				target: content,
				props: {
					notes,
					noteRepository: this.notes,
					propertySelection,
					notePropertyRepository: this.noteProperties,
					isNew,
					viewModel: writableProperties(
						this.state,
						(key, newValue) => {
							this.state[key] = newValue;
							this.displayText = this.computeDisplayText();
							this.workspace.requestSaveLayout();
						},
					),
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
		});
	}

	protected onClose(): Promise<void> {
		this.component?.$destroy();
		return super.onClose();
	}
}
