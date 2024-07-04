import ObsidianTimeline from "../../obsidian/timeline/NoteTimeline.svelte";
import type { Unsubscribe } from "src/obsidian/Events";
import { writableProperties } from "../../timeline/Persistence";
import { type ObsidianNoteTimelineViewModel } from "src/obsidian/timeline/viewModel";
import { TimelineFileItem } from "src/obsidian/timeline/TimelineFileItem";
import { NoPropertySelector } from "src/obsidian/timeline/settings/property/NotePropertySelector";
import type { Subscriber } from "svelte/store";
import { type NotePropertyRepository } from "src/note/property/repository";
import type { Note } from "src/note";
import type { NoteRepository } from "src/note/repository";

export const OBSIDIAN_LEAF_VIEW_TYPE: string = "VIEW_TYPE_TIMELINE_VIEW";

export class TimelineTab {
	private _transientState: { isNew?: boolean } = {};
	private state: Partial<ObsidianNoteTimelineViewModel>;
	private component: ObsidianTimeline | null;
	private initialization?: Promise<void>;
	private completeInitialization: () => void;

	constructor(
		private notes: NoteRepository,
		private notePropertyRepository: NotePropertyRepository,
	) {
		this.component = null;
		this.completeInitialization = () => {};
		this.initialization = new Promise(resolve => {
			this.completeInitialization = resolve;
		});
		this.state = {};
	}

	get tabName(): string {
		if ((this.state.settings?.filter?.query ?? "") !== "") {
			return `Timeline view - ${this.state.settings!.filter!.query}`;
		}
		return "Timeline view";
	}

	onTabNameChange(run: Subscriber<string>): Unsubscribe {
		let currentName = this.tabName;
		const listener = () => {
			const newName = this.tabName;
			if (newName !== currentName) {
				currentName = newName;
				run(newName);
			}
		};
		this.stateSubscribers.push(listener);
		return () => this.stateSubscribers.remove(listener);
	}

	#noteSelectedSubscribers: ((note: Note, cause?: Event) => void)[] = [];
	onNoteSelected(run: (note: Note, cause?: Event) => void): Unsubscribe {
		this.#noteSelectedSubscribers.push(run);
		return () => this.#noteSelectedSubscribers.remove(run);
	}

	#stateChangedSubscribers: (() => void)[] = [];
	onStateChanged(run: () => void): Unsubscribe {
		this.#stateChangedSubscribers.push(run);
		return () => this.#stateChangedSubscribers.remove(run);
	}

	get transientState() {
		return this._transientState;
	}

	set transientState(state: { isNew?: boolean }) {
		this._transientState = state;
	}

	private stateSubscribers = [] as (() => void)[];
	getState() {
		this.stateSubscribers.forEach(listener => listener());
		return this.state;
	}

	setState(state: any) {
		this.state = state;
		this.completeInitialization();
	}

	addNote(note: Note) {
		this.component?.addFile(note);
	}

	noteRenamed(note: Note, oldName: string) {
		this.component?.renameFile(note, oldName);
	}

	noteModified(note: Note) {
		this.component?.modifyFile(note);
	}

	removeNote(note: Note) {
		this.component?.deleteFile(note);
	}

	async render(header: Element, content: Element) {
		const container = content;

		container.createEl("progress");

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
			container.empty();
			container.setAttribute(
				"style",
				"padding:0;position: relative;overflow-x:hidden;overflow-y:hidden",
			);

			this.component = new ObsidianTimeline({
				target: container,
				props: {
					notes,
					noteRepository: this.notes,
					propertySelection,
					notePropertyRepository: this.notePropertyRepository,
					isNew: this._transientState.isNew,
					viewModel: writableProperties(
						this.state,
						(key, newValue) => {
							this.state[key] = newValue;
							this.#stateChangedSubscribers
								.slice()
								.forEach(fn => fn());
						},
					),
				},
			});

			this.component.$on("noteSelected", event => {
				this.#noteSelectedSubscribers
					.slice()
					.forEach(listener =>
						listener(event.detail.note, event.detail.event),
					);
			});
		});
	}

	onClose() {
		if (this.component != null) {
			this.component.$destroy();
		}
	}
}
