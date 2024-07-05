import {
	ItemView,
	MetadataCache,
	TFile,
	Vault,
	WorkspaceLeaf,
	type Plugin,
	type ViewStateResult,
} from "obsidian";
import {
	TimelineTab,
	OBSIDIAN_LEAF_VIEW_TYPE,
} from "src/usecases/timeline/TimelineTab";
import type { Workspace } from ".";
import type { ObsidianNoteTimelineViewModel } from "../timeline/viewModel";
import type { NotePropertyRepository } from "src/note/property/repository";
import type { NoteRepository } from "src/note/repository";
import { ObsidianNote } from "src/note/obsidian-repository";

let creationCallback: ((tab: TimelineTab) => void) | undefined;

export function registerTimelineTab(
	plugin: Plugin,
	workspace: Workspace,
	vault: Vault,
	metadata: MetadataCache,
	notes: NoteRepository,
	notePropertyRepository: NotePropertyRepository,
) {
	plugin.registerView(OBSIDIAN_LEAF_VIEW_TYPE, leaf => {
		const tab = new TimelineTab(notes, notePropertyRepository);
		if (creationCallback) {
			creationCallback(tab);
		}
		return new TimelineLeafView(leaf, tab, workspace, vault, metadata);
	});
}

export function createTimelineTab(
	workspace: Workspace,
	initialState?: Partial<ObsidianNoteTimelineViewModel>,
) {
	creationCallback = tab => {
		creationCallback = undefined;
		tab.transientState = { isNew: true };
	};
	workspace.createNewLeaf(OBSIDIAN_LEAF_VIEW_TYPE, true, initialState);
}

class TimelineLeafView extends ItemView {
	constructor(
		leaf: WorkspaceLeaf,
		private tab: TimelineTab,
		workspace: Workspace,
		vault: Vault,
		metadata: MetadataCache,
	) {
		super(leaf);

		this.navigation = true; // hide status bar 

		tab.onTabNameChange(newName => {
			(this as any).titleEl.setText(newName);
			(leaf as any).updateHeader();
		});

		tab.onNoteSelected((note, cause) => {
			if (cause instanceof MouseEvent || cause instanceof KeyboardEvent) {
				workspace.openFile(note, cause);
			} else {
				workspace.openFileInNewTab(note);
			}
		});

		tab.onStateChanged(() => {
			workspace.saveState();
		});

		this.registerEvent(
			vault.on("create", file => {
				if (file instanceof TFile) {
					tab.addNote(new ObsidianNote(file, metadata));
				}
			}),
		);
		this.registerEvent(
			vault.on("rename", (file, oldPath) => {
				if (file instanceof TFile) {
					tab.noteRenamed(new ObsidianNote(file, metadata), oldPath);
				}
			}),
		);
		this.registerEvent(
			vault.on("modify", file => {
				if (file instanceof TFile) {
					tab.noteModified(new ObsidianNote(file, metadata));
				}
			}),
		);
		this.registerEvent(
			metadata.on("changed", file => {
				if (file instanceof TFile) {
					tab.noteModified(new ObsidianNote(file, metadata));
				}
			}),
		);
		this.registerEvent(
			vault.on("delete", file => {
				if (file instanceof TFile) {
					tab.removeNote(new ObsidianNote(file, metadata));
				}
			}),
		);
	}

	getIcon(): string {
		return "waypoints";
	}

	getViewType(): string {
		return OBSIDIAN_LEAF_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.tab.tabName;
	}

	getEphemeralState() {
		return this.tab.transientState;
	}

	setEphemeralState(state: any): void {
		this.tab.transientState = state;
		super.setEphemeralState(state);
	}

	getState() {
		return this.tab.getState();
	}

	setState(state: any, result: ViewStateResult): Promise<void> {
		this.tab.setState(state);
		return super.setState(state, result);
	}

	protected async onOpen(): Promise<void> {
		const header = this.containerEl.children[0];
		const container = this.containerEl.children[1];
		await this.tab.render(header, container);
	}

	protected async onClose(): Promise<void> {
		this.tab.onClose();
	}
}
