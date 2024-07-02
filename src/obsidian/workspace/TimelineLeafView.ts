import {
	ItemView,
	WorkspaceLeaf,
	type Plugin,
	type ViewStateResult,
} from "obsidian";
import {
	TimelineTab,
	OBSIDIAN_LEAF_VIEW_TYPE,
} from "src/usecases/timeline/TimelineTab";
import type { Obsidian } from "../Obsidian";
import type { Workspace } from ".";
import type { ObsidianNoteTimelineViewModel } from "../timeline/viewModel";
import type { NotePropertyRepository } from "src/note/property/repository";

let creationCallback: ((tab: TimelineTab) => void) | undefined;

export function registerTimelineTab(
	plugin: Plugin,
	obsidian: Obsidian,
	notePropertyRepository: NotePropertyRepository,
) {
	plugin.registerView(OBSIDIAN_LEAF_VIEW_TYPE, leaf => {
		const tab = new TimelineTab(obsidian, notePropertyRepository);
		if (creationCallback) {
			creationCallback(tab);
		}
		return new TimelineLeafView(leaf, tab);
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
	constructor(leaf: WorkspaceLeaf, private tab: TimelineTab) {
		super(leaf);

		tab.onTabNameChange(newName => {
			(this as any).titleEl.setText(newName);
			(leaf as any).updateHeader();
		});
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
