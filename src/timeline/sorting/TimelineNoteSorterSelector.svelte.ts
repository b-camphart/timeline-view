import type {NotePropertyRepository} from "src/note/property/repository";
import {isNumericNoteProperty, NotePropertyTypes, TimelineNoteSorterProperty} from "./TimelineNoteSorterProperty";

async function propertyFromName(name: string, noteProperties: NotePropertyRepository) {
	if (name === TimelineNoteSorterProperty.Created.name()) {
		return TimelineNoteSorterProperty.Created;
	}

	if (name === TimelineNoteSorterProperty.Modified.name()) {
		return TimelineNoteSorterProperty.Modified;
	}

	const selectedProperty = await noteProperties.getPropertyByName(name);
	if (selectedProperty == null) {
		return TimelineNoteSorterProperty.Created;
	}

	if (!isNumericNoteProperty(selectedProperty)) {
		return TimelineNoteSorterProperty.Created;
	}

	return TimelineNoteSorterProperty.fromNoteProperty(selectedProperty);
}

export class TimelineNoteSorterSelector {
	/**
	 * Ensures that the selected property still exists, and is still of a
	 * supported type
	 */
	static async sanitize(
		selectedPropertyName: string,
		secondaryPropertyName: string,
		secondaryPropertyInUse: boolean,
		noteProperties: NotePropertyRepository,
		saveSelectedPropertyName: (name: string) => void,
		saveSecondaryPropertyName: (name: string) => void,
		saveSecondaryPropertyUse: (use: boolean) => void,
	) {
		const selectedProperty = await propertyFromName(selectedPropertyName, noteProperties);
		const secondaryProperty = await propertyFromName(secondaryPropertyName, noteProperties);

		return new TimelineNoteSorterSelector(
			selectedProperty,
			secondaryProperty,
			secondaryPropertyInUse,
			noteProperties,
			saveSelectedPropertyName,
			saveSecondaryPropertyName,
			saveSecondaryPropertyUse,
		);
	}

	constructor(
		selectedProperty: TimelineNoteSorterProperty,
		secondaryProperty: TimelineNoteSorterProperty,
		secondaryPropertyInUse: boolean,
		noteProperties: NotePropertyRepository,
		saveSelectedPropertyName: (name: string) => void,
		saveSecondaryPropertyName: (name: string) => void,
		saveSecondaryPropertyUse: (use: boolean) => void,
	) {
		this.#selectedProperty = selectedProperty;
		this.#secondaryProperty = secondaryProperty;
		this.#secondaryPropertyInUse = secondaryPropertyInUse;
		this.#noteProperties = noteProperties;
		this.#saveSelectedPropertyName = saveSelectedPropertyName;
		this.#saveSecondaryPropertyName = saveSecondaryPropertyName;
		this.#saveSecondaryPropertyUse = saveSecondaryPropertyUse;
	}

	#selectedProperty = $state(TimelineNoteSorterProperty.Created);

	selectedProperty(): TimelineNoteSorterProperty {
		return this.#selectedProperty;
	}

	#secondaryProperty = $state(TimelineNoteSorterProperty.Modified);

	secondaryProperty() {
		return this.#secondaryProperty;
	}

	#saveSelectedPropertyName;
	selectProperty(property: TimelineNoteSorterProperty) {
		this.#selectedProperty = property;
		this.#saveSelectedPropertyName(property.name());
	}

	#saveSecondaryPropertyName;
	selectSecondaryProperty(property: TimelineNoteSorterProperty) {
		this.#secondaryProperty = property;
		this.#saveSecondaryPropertyName(property.name());
	}

	#secondaryPropertyInUse = $state(false);
	secondaryPropertyInUse() {
		return this.#secondaryPropertyInUse;
	}

	#saveSecondaryPropertyUse;
	toggleSecondaryProperty(use: boolean) {
		this.#secondaryPropertyInUse = use;
		this.#saveSecondaryPropertyUse(use);
	}

	#noteProperties;
	async availableProperties() {
		const noteProperties = await this.#noteProperties.listPropertiesOfTypes(NotePropertyTypes);

		const properties: [TimelineNoteSorterProperty, TimelineNoteSorterProperty, ...TimelineNoteSorterProperty[]] = [
			TimelineNoteSorterProperty.Created,
			TimelineNoteSorterProperty.Modified,
		];

		for (const property of noteProperties) {
			properties.push(TimelineNoteSorterProperty.fromNoteProperty(property));
		}

		return properties;
	}
}
