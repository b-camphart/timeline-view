import type {NotePropertyRepository} from "src/note/property/repository";
import {TimelineNoteSorterSelector} from "../sorting/TimelineNoteSorterSelector.svelte.js";
import {TimelineProperty} from "./TimelineProperty";

export type TimelinePropertySelectorState = {
	selectedPropertyName: string;
	secondaryPropertyName: string;
	secondaryPropertyInUse: boolean;
	propertyPreferences: Record<string, boolean>;
};

export class TimelinePropertySelector {
	/**
	 * Initializes a new TimelinePropertySelector by ensuring the selected
	 * property still exists, and that each preference has a corresponding
	 * property.
	 */
	static async sanitize(
		noteProperties: NotePropertyRepository,
		savedState: TimelinePropertySelectorState,
		onStateChanged: (state: TimelinePropertySelectorState) => void,
	): Promise<TimelinePropertySelector> {
		const selector = await TimelineNoteSorterSelector.sanitize(
			savedState.selectedPropertyName,
			savedState.secondaryPropertyName,
			savedState.secondaryPropertyInUse,
			noteProperties,
			(selectedPropertyName: string) => {
				savedState.selectedPropertyName = selectedPropertyName;
				onStateChanged(savedState);
			},
			(secondaryPropertyName: string) => {
				savedState.secondaryPropertyName = secondaryPropertyName;
				onStateChanged(savedState);
			},
			(useSecondaryProperty: boolean) => {
				savedState.secondaryPropertyInUse = useSecondaryProperty;
				onStateChanged(savedState);
			},
		);

		const properties = await selector.availableProperties();
		const newPreferences: Record<string, boolean> = {};
		for (const property of properties) {
			if (savedState.propertyPreferences.hasOwnProperty(property.name())) {
				newPreferences[property.name()] = savedState.propertyPreferences[property.name()];
			}
		}

		return new TimelinePropertySelector(selector, newPreferences, preferences => {
			savedState.propertyPreferences = preferences;
			onStateChanged(savedState);
		});
	}

	constructor(
		public readonly timelineNoteSorterSelector: TimelineNoteSorterSelector,
		private readonly propertiesPreferences: Record<string, boolean>,
		private readonly onPreferencesChanged: (preferences: Record<string, boolean>) => void,
	) {}

	#savePropertyPreference(name: string, preferInts: boolean) {
		this.propertiesPreferences[name] = preferInts;
		this.onPreferencesChanged(this.propertiesPreferences);
	}

	selectedProperty() {
		const sortProperty = this.timelineNoteSorterSelector.selectedProperty();
		return new TimelineProperty(
			sortProperty,
			this.#savePropertyPreference.bind(this),
			this.propertiesPreferences[sortProperty.name()],
		);
	}

	secondaryProperty() {
		const sortProperty = this.timelineNoteSorterSelector.secondaryProperty();
		return new TimelineProperty(
			sortProperty,
			this.#savePropertyPreference.bind(this),
			this.propertiesPreferences[sortProperty.name()],
		);
	}

	secondaryPropertyInUse() {
		return this.timelineNoteSorterSelector.secondaryPropertyInUse();
	}
}
