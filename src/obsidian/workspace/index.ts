import { Keymap, type App, type UserEvent, WorkspaceLeaf } from "obsidian";
import type { Note } from "src/note";
import { ObsidianNote } from "src/note/obsidian-repository";

export class Workspace {
	constructor(private app: App) {}

	async createNewLeaf<State>(
		type: string,
		active: boolean,
		state?: State,
		transientState?: any,
	): Promise<WorkspaceLeaf> {
		const leaf = this.app.workspace.getLeaf(true);
		await leaf.setViewState({
			type,
			active,
			state,
		}, transientState);
		this.app.workspace.revealLeaf(leaf);
		return leaf;
	}

	openFile(file: Note, fromEvent: UserEvent) {
		if (file instanceof ObsidianNote) {
			this.app.workspace
				.getLeaf(Keymap.isModEvent(fromEvent))
				.openFile(file.file());
		}
	}

	openFileInNewTab(file: Note) {
		if (file instanceof ObsidianNote) {
			this.app.workspace.getLeaf(true).openFile(file.file());
		}
	}

	saveState() {
		this.app.workspace.requestSaveLayout();
	}
}

export class TabPresenter {
	constructor(private leaf: WorkspaceLeaf) {}
}
