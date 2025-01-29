import type * as valueSelector from "src/note/property/valueSelector";
import type * as note_1 from "src/note";
import type * as color from "src/timeline/item/color";

export class TimelineNoteItem {
	constructor(
		public note: note_1.Note,
		private getValueSelector: (this: void) => valueSelector.NumericNoteValueSelector,
		private colorSupplier: color.TimelineItemColorSupplier,
	) {
		this.value = this.#calculateValue;
	}

	toString() {
		return `TimelineNoteItem{ value: ${this.value()}, id: ${this.id()}, name: ${this.name()} }`;
	}

	id(): string {
		return this.note.id();
	}

	#value: number | undefined;
	value: () => number;

	length() {
		return 0;
	}

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

	color(): string | undefined {
		return this.colorSupplier.itemColorForNote(this.note);
	}
}
