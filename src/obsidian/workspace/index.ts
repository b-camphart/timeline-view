import { Keymap, type App, type TFile, type UserEvent, WorkspaceLeaf } from "obsidian";
import type { Note } from "../files/Note";

export class Workspace {
	constructor(private app: App) {}

	async createNewLeaf<State>(type: string, active: boolean, state?: State): Promise<void> {
		const leaf = this.app.workspace.getLeaf(true);
		await leaf.setViewState({
			type,
			active,
			state
		});
		this.app.workspace.revealLeaf(leaf);
	}

	openFile(file: Note, fromEvent: UserEvent) {
		file.openIn(this.app.workspace.getLeaf(Keymap.isModEvent(fromEvent)));
	}

	openFileInNewTab(file: Note) {
		file.openIn(this.app.workspace.getLeaf("tab"));
	}

	saveState() {
		this.app.workspace.requestSaveLayout();
	}
}

export class TabPresenter {

	constructor(
		private leaf: WorkspaceLeaf
	) {

	}

}