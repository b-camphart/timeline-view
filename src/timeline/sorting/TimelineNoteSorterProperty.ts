import type { Note } from "src/note";
import type { NumericNoteValueSelector } from "src/note/property/valueSelector";
import type { NoteProperty } from "src/note/property";
import { isNotePropertyOfType } from "src/note/property/reflection";

/**
 * The raw types of NotePropertys that can be used in the timeline
 */
export const NotePropertyTypes = ["number", "date", "datetime"] as const;

/**
 * The types of NotePropertys that can be used in the timeline
 */
type NumericNotePropertyType = (typeof NotePropertyTypes)[number];

/**
 * The type of NoteProperty that can be used in the timeline
 */
type NumericNoteProperty = NoteProperty<NumericNotePropertyType>;

export function isNumericNoteProperty(
	property: NoteProperty<string>
): property is NumericNoteProperty {
	return isNotePropertyOfType(NotePropertyTypes, property);
}

export enum TimelineNoteSorterPropertyType {
	Number,
	Date,
	DateTime,
}

export function timelineNoteSorterPropertyType(type: NumericNotePropertyType) {
	switch (type) {
		case "number":
			return TimelineNoteSorterPropertyType.Number;
		case "date":
			return TimelineNoteSorterPropertyType.Date;
		case "datetime":
			return TimelineNoteSorterPropertyType.DateTime;
	}
}

export class NotePropertyValueSelector implements NumericNoteValueSelector {
	constructor(private property: NumericNoteProperty) {}

	selectValueFromNote(note: Note): number | null {
		const properties = note.properties();
		if (!(this.property.name() in properties)) return null;
		const value = note.properties()[this.property.name()];
		if (typeof value === "number") return value;
		if (typeof value === "string") {
			const datetime = window.moment(value);
			if (datetime.isValid()) {
				return datetime.valueOf();
			}
			const parsed = parseFloat(value);
			if (!isNaN(parsed)) return parsed;
			return null;
		}
		return null;
	}
}

export class TimelineNoteSorterProperty implements NumericNoteValueSelector {
	static fromNoteProperty(
		noteProperty: NumericNoteProperty
	): TimelineNoteSorterProperty {
		return new TimelineNoteSorterProperty(
			noteProperty.name(),
			timelineNoteSorterPropertyType(noteProperty.type()),
			new NotePropertyValueSelector(noteProperty)
		);
	}

	static update(
		sorter: TimelineNoteSorterProperty,
		noteProperty: NumericNoteProperty
	) {
		if (
			sorter === TimelineNoteSorterProperty.Created ||
			sorter === TimelineNoteSorterProperty.Modified
		)
			return;
		sorter.#name = noteProperty.name();
		sorter.#type = timelineNoteSorterPropertyType(noteProperty.type());
		sorter.#valueSelector = new NotePropertyValueSelector(noteProperty);
	}

	constructor(
		name: string,
		type: TimelineNoteSorterPropertyType,
		valueSelector: NumericNoteValueSelector
	) {
		this.#name = name;
		this.#type = type;
		this.#valueSelector = valueSelector;
	}

	#name: string;
	name() {
		return this.#name;
	}

	#type: TimelineNoteSorterPropertyType;
	type() {
		return this.#type;
	}

	#valueSelector: NumericNoteValueSelector;

	sortNotes(notes: Note[]): void {
		notes.sort((a, b) => {
			return (
				(this.#valueSelector.selectValueFromNote(a) ?? 0) -
				(this.#valueSelector.selectValueFromNote(b) ?? 0)
			);
		});
	}

	selectValueFromNote(note: Note): number | null {
		return this.#valueSelector.selectValueFromNote(note);
	}

	static readonly Created = new TimelineNoteSorterProperty(
		"created",
		TimelineNoteSorterPropertyType.DateTime,
		{
			selectValueFromNote(note) {
				return note.created();
			},
		}
	);
	static readonly Modified = new TimelineNoteSorterProperty(
		"modified",
		TimelineNoteSorterPropertyType.DateTime,
		{
			selectValueFromNote(note) {
				return note.modified();
			},
		}
	);
}
