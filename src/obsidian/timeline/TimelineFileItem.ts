import type { TimelineItem } from "../../timeline/Timeline";
import type { FilePropertySelector } from "./settings/property/NotePropertySelector";
import type { ItemGroup } from "./settings/groups/FileGroup";
import type { Note } from "src/note";

export class TimelineFileItem implements TimelineItem {
	private _group: ItemGroup | undefined;

	constructor(
		public obsidianFile: Note,
		private propertySelection: FilePropertySelector,
	) {
		this.value = this.#calculateValue;
	}

	id(): string {
		return this.obsidianFile.id();
	}

	#value: number | undefined;
	value: () => number;

	#getCachedValue() {
		return this.#value!!;
	}

	#calculateValue() {
		const value = this.propertySelection.selectProperty(this.obsidianFile);
		this.#value = value;
		this.value = this.#getCachedValue;
		return value;
	}

	_invalidateValueCache() {
		this.#value = undefined;
		this.value = this.#calculateValue;
	}

	name(): string {
		return this.obsidianFile.name();
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
