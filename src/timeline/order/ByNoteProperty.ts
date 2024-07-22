import type { NoteProperty } from "src/note/property";
import type { NotePropertyRepository } from "src/note/property/repository";
import type { Note } from "src/note";
import type { NoteSorter } from "src/note/order";
import { get } from "svelte/store";
import type { TimelineNoteItem } from "src/timeline/TimelineNoteItem";
import {
	timelineDateValueDisplay,
	timelineNumericValueDisplay,
	type RulerValueDisplay,
} from "../Timeline";
import type { NamespacedWritableFactory } from "src/timeline/Persistence";

/**
 * Orders the timeline items by a selected property of the notes.
 */
export class TimelineOrderByNoteProperty {
	static async create(
		noteProperties: NotePropertyRepository,
		savedState: NamespacedWritableFactory<{
			property: string;
			propertiesUseWholeNumbers: Record<string, boolean>;
		}>,
	) {
		return new TimelineOrderByNoteProperty(
			noteProperties,
			await getInitialSelectedProperty(savedState, noteProperties),
			savedState,
		);
	}

	constructor(
		private readonly noteProperties: NotePropertyRepository,
		selectedProperty: TimelineOrderNoteProperty,
		private readonly savedState: NamespacedWritableFactory<{
			property: string;
			propertiesUseWholeNumbers: Record<string, boolean>;
		}>,
	) {
		this.#selectedProperty = selectedProperty;
	}

	async availableProperties() {
		const noteProperties = await this.noteProperties.listPropertiesOfTypes(
			numericNotePropertyTypes,
		);

		const properties: TimelineOrderNoteProperty[] = [
			TimelineOrderNoteProperty.Created,
			TimelineOrderNoteProperty.Modified,
		];

		for (const property of noteProperties) {
			properties.push(
				new TimelineOrderNoteProperty(
					property.name(),
					notePropertyTypeToTimelineOrderNotePropertyType(
						property.type(),
					),
					new NotePropertyValueSelector(property),
					this.savedState.namespace("propertiesUseWholeNumbers"),
				),
			);
		}

		return properties;
	}

	#selectedProperty: TimelineOrderNoteProperty;

	selectedProperty() {
		return this.#selectedProperty;
	}

	selectProperty(property: TimelineOrderNoteProperty) {
		this.#selectedProperty = property;
		this.savedState.make("property", "created").set(property.name());
	}

	sortItems(items: TimelineNoteItem[]) {
		for (const item of items) {
			item._invalidateValueCache();
		}
		items.sort((a, b) => {
			return (
				this.#selectedProperty.selectValueFromItem(a) -
				this.#selectedProperty.selectValueFromItem(b)
			);
		});
	}
}

async function getInitialSelectedProperty(
	savedState: NamespacedWritableFactory<{
		property: string;
		propertiesUseWholeNumbers: Record<string, boolean>;
	}>,
	noteProperties: NotePropertyRepository,
): Promise<TimelineOrderNoteProperty> {
	const savedName = savedState.make("property", "created");
	const propertyName = get(savedName);
	if (propertyName === TimelineOrderNoteProperty.Created.name()) {
		return TimelineOrderNoteProperty.Created;
	} else if (propertyName === TimelineOrderNoteProperty.Modified.name()) {
		return TimelineOrderNoteProperty.Modified;
	}

	const noteProperty = await noteProperties.getPropertyByName(propertyName);

	if (!noteProperty) {
		return TimelineOrderNoteProperty.Created;
	} else if (!isNumericaNoteProperty(noteProperty)) {
		return TimelineOrderNoteProperty.Created;
	}

	return new TimelineOrderNoteProperty(
		noteProperty.name(),
		notePropertyTypeToTimelineOrderNotePropertyType(noteProperty.type()),
		new NotePropertyValueSelector(noteProperty),
		savedState.namespace("propertiesUseWholeNumbers"),
	);
}

/**
 * Selects value from a note and converts it to a numeric value.
 */
export interface NoteTimelineValueSelector {
	selectValueFromNote(note: Note): number;
}

const NoteCreatedValueSelector: NoteTimelineValueSelector = {
	selectValueFromNote(note) {
		return note.created();
	},
};

const NoteModifiedValueSelector: NoteTimelineValueSelector = {
	selectValueFromNote(note) {
		return note.modified();
	},
};

class NotePropertyValueSelector implements NoteTimelineValueSelector {
	constructor(private property: NoteProperty<NumericNotePropertyType>) {}

	selectValueFromNote(note: Note): number {
		const value = note.properties()[this.property.name()];
		if (typeof value === "number") return value;
		if (typeof value === "string") {
			const parsed = parseFloat(value);
			if (!isNaN(parsed)) return parsed;
			return 0;
		}
		return 0;
	}
}

export class TimelineNoteOrder
	implements NoteSorter, NoteTimelineValueSelector
{
	#selector: NoteTimelineValueSelector;

	constructor(selector: NoteTimelineValueSelector) {
		this.#selector = selector;
	}

	sortNotes(notes: Note[]): void {
		notes.sort((a, b) => {
			return (
				this.#selector.selectValueFromNote(a) -
				this.#selector.selectValueFromNote(b)
			);
		});
	}

	selectValueFromNote(note: Note): number {
		return this.#selector.selectValueFromNote(note);
	}

	/**
	 * Selects the `created` value from a note, and sorts notes by it.
	 */
	static readonly ByNoteCreated: TimelineNoteOrder = new TimelineNoteOrder(
		NoteCreatedValueSelector,
	);

	/**
	 * Selects the `modified` value from a note, and sorts notes by it.
	 */
	static readonly ByNoteModified: TimelineNoteOrder = new TimelineNoteOrder(
		NoteModifiedValueSelector,
	);
}

const numericNotePropertyTypes = ["number", "datetime", "date"] as const;
type NumericNotePropertyType = (typeof numericNotePropertyTypes)[number];

function isNumericaNoteProperty(
	property: NoteProperty<string>,
): property is NoteProperty<NumericNotePropertyType> {
	return numericNotePropertyTypes.includes(
		property.type() as NumericNotePropertyType,
	);
}

function notePropertyTypeToTimelineOrderNotePropertyType(
	type: NumericNotePropertyType,
) {
	switch (type) {
		case "number":
			return TimelineOrderPropertyType.Number;
		case "datetime":
			return TimelineOrderPropertyType.DateTime;
		case "date":
			return TimelineOrderPropertyType.Date;
	}
}

export const enum TimelineOrderPropertyType {
	Number,
	Date,
	DateTime,
}

export class TimelineOrderNoteProperty implements NoteTimelineValueSelector {
	constructor(
		name: string,
		type: TimelineOrderPropertyType,
		valueSelector: NoteTimelineValueSelector,
		savedPreferences?: NamespacedWritableFactory<Record<string, boolean>>,
	) {
		this.#name = name;
		this.#type = type;
		this.#valueSelector = valueSelector;
		this.#savedPreferences = savedPreferences;
	}

	#name: string;
	name(): string {
		return this.#name;
	}

	#type: TimelineOrderPropertyType;
	type(): TimelineOrderPropertyType {
		return this.#type;
	}

	#valueSelector: NoteTimelineValueSelector;
	selectValueFromNote(note: Note): number {
		return this.#valueSelector.selectValueFromNote(note);
	}

	selectValueFromItem(item: TimelineNoteItem): number {
		return this.#valueSelector.selectValueFromNote(item.note);
	}

	#savedPreferences:
		| NamespacedWritableFactory<Record<string, boolean>>
		| undefined;
	#preferInt: boolean = true;
	useWholeNumbers() {
		if (this.#type !== TimelineOrderPropertyType.Number) {
			return;
		}
		this.#preferInt = true;
		if (this.#savedPreferences) {
			this.#savedPreferences
				.make(this.#name, this.#preferInt)
				.set(this.#preferInt);
		}
	}

	useDecimalNumbers() {
		if (this.#type !== TimelineOrderPropertyType.Number) {
			return;
		}
		this.#preferInt = false;
		if (this.#savedPreferences) {
			this.#savedPreferences
				.make(this.#name, this.#preferInt)
				.set(this.#preferInt);
		}
	}

	prefersWholeNumbers(): boolean {
		if (this.#type !== TimelineOrderPropertyType.Number) {
			return true;
		}
		return this.#preferInt;
	}

	sanitizeValue(value: number): number {
		if (
			!this.#preferInt &&
			this.#type === TimelineOrderPropertyType.Number
		) {
			return value;
		}

		return Math.round(value);
	}

	displayAs(): RulerValueDisplay {
		switch (this.#type) {
			case TimelineOrderPropertyType.Number:
				return timelineNumericValueDisplay();
			case TimelineOrderPropertyType.Date:
				return timelineDateValueDisplay();
			case TimelineOrderPropertyType.DateTime:
				return timelineDateValueDisplay();
		}
	}

	static readonly Created: TimelineOrderNoteProperty =
		new TimelineOrderNoteProperty(
			"created",
			TimelineOrderPropertyType.DateTime,
			NoteCreatedValueSelector,
		);

	static readonly Modified: TimelineOrderNoteProperty =
		new TimelineOrderNoteProperty(
			"modified",
			TimelineOrderPropertyType.DateTime,
			NoteModifiedValueSelector,
		);
}
