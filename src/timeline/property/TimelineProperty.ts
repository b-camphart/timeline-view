import type {NumericNoteValueSelector} from "src/note/property/valueSelector";
import {TimelineItemValueProperty, type NumberPreferenceReaderWriter} from "../item/valuePreference";
import {TimelineNoteSorterPropertyType} from "../sorting/TimelineNoteSorterProperty";
import {TimelineNoteSorterProperty} from "../sorting/TimelineNoteSorterProperty";
import {timelineDateValueDisplay, timelineNumericValueDisplay, type RulerValueDisplay} from "../Timeline";
import type {TimelineNoteItem} from "../TimelineNoteItem";
import type {Note} from "src/note";

export class TimelineProperty implements NumberPreferenceReaderWriter, NumericNoteValueSelector {
	private readonly preference: TimelineItemValueProperty;
	constructor(
		private readonly sorter: TimelineNoteSorterProperty,
		savePreference: (name: string, preferInts: boolean) => void,
		preferInts?: boolean,
	) {
		if (sorter.type() !== TimelineNoteSorterPropertyType.Number) {
			this.preference = new TimelineItemValueProperty.Date(sorter.name());
		} else this.preference = new TimelineItemValueProperty.Number(sorter.name(), savePreference, preferInts);
	}

	name() {
		return this.sorter.name();
	}

	displayedAs(): RulerValueDisplay {
		if (this.sorter.type() === TimelineNoteSorterPropertyType.Number) {
			return timelineNumericValueDisplay();
		}
		return timelineDateValueDisplay();
	}

	sortItems(items: TimelineNoteItem[]) {
		const sortProperty = this.sorter;
		items.sort((a, b) => {
			return (sortProperty.selectValueFromNote(a.note) ?? 0) - (sortProperty.selectValueFromNote(b.note) ?? 0);
		});
	}

	sanitizeValue(value: number): number {
		return this.preference.sanitizeValue(value);
	}

	selectValueFromNote(note: Note): number | null {
		return this.sorter.selectValueFromNote(note);
	}

	prefersFloats() {
		return this.preference.prefersFloats();
	}

	prefersIntegers() {
		return this.preference.prefersIntegers();
	}

	useIntegers() {
		this.preference.useIntegers();
	}

	useFloats() {
		this.preference.useFloats();
	}

	canBeChanged(): boolean {
		return this.preference.canBeChanged();
	}

	isCreatedProperty(): boolean {
		return this.sorter === TimelineNoteSorterProperty.Created;
	}

	isModifiedProperty(): boolean {
		return this.sorter === TimelineNoteSorterProperty.Modified;
	}
}
