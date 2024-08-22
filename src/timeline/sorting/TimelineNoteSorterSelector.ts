import type { NotePropertyRepository } from "src/note/property/repository";
import {
	isNumericNoteProperty,
	NotePropertyTypes,
	TimelineNoteSorterProperty,
} from "./TimelineNoteSorterProperty";

export class TimelineNoteSorterSelector {
	/**
	 * Ensures that the selected property still exists, and is still of a
	 * supported type
	 */
	static async sanitize(
		selectedPropertyName: string,
		noteProperties: NotePropertyRepository,
		saveSelectedPropertyName: (name: string) => void,
	) {
		const createWithProperty = (property: TimelineNoteSorterProperty) => {
			return new TimelineNoteSorterSelector(
				property,
				noteProperties,
				saveSelectedPropertyName,
			);
		};

		if (
			selectedPropertyName === TimelineNoteSorterProperty.Created.name()
		) {
			return createWithProperty(TimelineNoteSorterProperty.Created);
		}

		if (
			selectedPropertyName === TimelineNoteSorterProperty.Modified.name()
		) {
			return createWithProperty(TimelineNoteSorterProperty.Modified);
		}

		const selectedProperty = await noteProperties.getPropertyByName(
			selectedPropertyName,
		);
		if (selectedProperty == null) {
			return createWithProperty(TimelineNoteSorterProperty.Created);
		}

		if (!isNumericNoteProperty(selectedProperty)) {
			return createWithProperty(TimelineNoteSorterProperty.Created);
		}

		return createWithProperty(
			TimelineNoteSorterProperty.fromNoteProperty(selectedProperty),
		);
	}

	constructor(
		selectedProperty: TimelineNoteSorterProperty,
		noteProperties: NotePropertyRepository,
		saveSelectedPropertyName: (name: string) => void,
	) {
		this.#selectedProperty = selectedProperty;
		this.#noteProperties = noteProperties;
		this.#saveSelectedPropertyName = saveSelectedPropertyName;
	}

	#selectedProperty;

	selectedProperty(): TimelineNoteSorterProperty {
		return this.#selectedProperty;
	}

	#saveSelectedPropertyName;
	selectProperty(property: TimelineNoteSorterProperty) {
		this.#selectedProperty = property;
		this.#saveSelectedPropertyName(property.name());
	}

	#noteProperties;
	async availableProperties() {
		const noteProperties = await this.#noteProperties.listPropertiesOfTypes(
			NotePropertyTypes,
		);

		const properties: [
			TimelineNoteSorterProperty,
			TimelineNoteSorterProperty,
			...TimelineNoteSorterProperty[],
		] = [
			TimelineNoteSorterProperty.Created,
			TimelineNoteSorterProperty.Modified,
		];

		for (const property of noteProperties) {
			properties.push(
				TimelineNoteSorterProperty.fromNoteProperty(property),
			);
		}

		return properties;
	}
}
