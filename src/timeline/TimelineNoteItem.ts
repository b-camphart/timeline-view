import type { NoteTimelineValueSelector } from "src/timeline/order/ByNoteProperty";
import type { ItemGroup } from "../obsidian/timeline/settings/groups/FileGroup";
import type { Note } from "src/note";

export class TimelineNoteItem {
	private _group: ItemGroup | undefined;

	constructor(
		public note: Note,
		private getValueSelector: (this: void) => NoteTimelineValueSelector,
	) {
		this.value = this.#calculateValue;
	}

	id(): string {
		return this.note.id();
	}

	#value: number | undefined;
	value: () => number;

	#getCachedValue(): number {
		return this.#value!;
	}

	#calculateValue(): number {
		const getValueSelector = this.getValueSelector;
		const value = getValueSelector().selectValueFromNote(this.note);
		this.#value = value;
		this.value = this.#getCachedValue;
		return value;
	}

	_invalidateValueCache() {
		this.#value = undefined;
		this.value = this.#calculateValue;
	}

	name(): string {
		return this.note.name();
	}

	applyGroup(group: ItemGroup | undefined) {
		this._group = group;
	}

	color(): string | undefined {
		return this._group?.color;
	}

	group(): string | undefined {
		return this._group?.id;
	}

	forgetGroup(): void {
		this._group = undefined;
	}
}
