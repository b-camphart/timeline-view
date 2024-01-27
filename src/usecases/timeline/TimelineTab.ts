import ObsidianTimeline from "../../obsidian/timeline/NoteTimeline.svelte";
import type { Obsidian } from "src/obsidian/Obsidian";
import type { Unsubscribe } from "src/obsidian/Events";
import { writableProperties } from "../../timeline/Persistence";
import { type ObsidianNoteTimelineViewModel } from "src/obsidian/timeline/viewModel";
import { TimelineFileItem } from "src/obsidian/timeline/TimelineFileItem";
import { NoPropertySelector } from "src/obsidian/timeline/settings/property/NotePropertySelector";
import { type Note } from "src/obsidian/files/Note";
import type { Subscriber } from "svelte/store";

export const OBSIDIAN_LEAF_VIEW_TYPE: string = "VIEW_TYPE_TIMELINE_VIEW";

export class TimelineTab {
	private _transientState: { isNew?: boolean } = {};
	private state: Partial<ObsidianNoteTimelineViewModel>;
	private component: ObsidianTimeline | null;
	private subscriptions: Unsubscribe[] | null;
	private initialization?: Promise<void>;
	private completeInitialization: () => void;

	constructor(private obsidian: Obsidian) {
		this.component = null;
		this.subscriptions = null;
		this.completeInitialization = () => {};
		this.initialization = new Promise(resolve => {
			this.completeInitialization = resolve;
		});
		this.state = {};
	}

	get tabName(): string {
		if ((this.state.settings?.filter?.query ?? "") !== "") {
			return `Timeline view - ${this.state.settings!.filter!.query}`
		}
		return "Timeline view";
	}

	onTabNameChange(run: Subscriber<string>): Unsubscribe {
		let currentName = this.tabName
		const listener = () => {
			const newName = this.tabName
			if (newName !== currentName) {
				currentName = newName
				run(newName)
			}
		}
		this.stateSubscribers.push(listener)
		return () => this.stateSubscribers.remove(listener)
	}

	get transientState() {
		return this._transientState
	}

	set transientState(state: { isNew?: boolean }) {
		this._transientState = state
	}

	private stateSubscribers = [] as (() => void)[]
	getState() {
		this.stateSubscribers.forEach(listener => listener());
		return this.state;
	}

	setState(state: any) {
		this.state = state;
		this.completeInitialization();
	}

	async render(header: Element, content: Element) {
		const container = content;
		container.createEl("progress");

		const propertySelection = {
			selector: NoPropertySelector,
			selectProperty(file: Note) {
				return this.selector.selectProperty(file);
			},
		};

		const files: Map<string, TimelineFileItem> = new Map();
		for (const file of await this.obsidian.vault().files().list()) {
			files.set(
				file.path(),
				new TimelineFileItem(file, propertySelection),
			);
		}

		this.initialization?.then(() => {
			delete this.initialization
			container.empty();
			container.setAttribute(
				"style",
				"padding:0;position: relative;overflow-x:hidden;",
			);

			this.component = new ObsidianTimeline({
				target: container,
				props: {
					files,
					propertySelection,
					obsidian: this.obsidian,
					isNew: this._transientState.isNew,
					viewModel: writableProperties(
						this.state,
						(key, newValue) => {
							console.log("timeline tab state key:", key, "updated", newValue);
							this.state[key] = newValue;
							this.obsidian.workspace().saveState();
						},
					),
				},
			});

			const fileRepo = this.obsidian.vault().files();

			this.subscriptions = [
				fileRepo.on("created", (file: Note) => {
					this.component?.addFile(file);
				}),
				fileRepo.on("deleted", (file: Note) => {
					this.component?.deleteFile(file);
				}),
				fileRepo.on("renamed", (file: Note, oldFile: string) => {
					this.component?.renameFile(file, oldFile);
				}),
				fileRepo.on("modified", (file: Note) => {
					this.component?.modifyFile(file);
				}),
			];
		});
	}

	onClose() {
		if (this.subscriptions != null) {
			this.subscriptions.forEach(unsubscribe => unsubscribe());
		}
		if (this.component != null) {
			this.component.$destroy();
		}
	}
}
