import type {NotePropertyRepository} from "src/note/property/repository";
import {TimelineNoteSorterSelector} from "../sorting/TimelineNoteSorterSelector.svelte.js";
import {TimelineProperty} from "./TimelineProperty";

export type TimelinePropertySelectorState = {
	selectedPropertyName: string;
	secondaryPropertyName: string;
	secondaryPropertyInUse: boolean;
	useSecondaryPropertyAs: "length" | "end";
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

		return new TimelinePropertySelector(selector, savedState, onStateChanged);
	}

	constructor(
		public readonly timelineNoteSorterSelector: TimelineNoteSorterSelector,
		private readonly savedState: TimelinePropertySelectorState,
		private readonly saveState: (state: TimelinePropertySelectorState) => void,
	) {}

	#savePropertyPreference(name: string, preferInts: boolean) {
		this.savedState.propertyPreferences[name] = preferInts;
		this.saveState(this.savedState);
	}

	selectedProperty() {
		const sortProperty = this.timelineNoteSorterSelector.selectedProperty();
		return new TimelineProperty(
			sortProperty,
			this.#savePropertyPreference.bind(this),
			this.savedState.propertyPreferences[sortProperty.name()],
		);
	}

	secondaryProperty() {
		const sortProperty = this.timelineNoteSorterSelector.secondaryProperty();
		return new TimelineProperty(
			sortProperty,
			this.#savePropertyPreference.bind(this),
			this.savedState.propertyPreferences[sortProperty.name()],
		);
	}

	secondaryPropertyInUse() {
		return this.timelineNoteSorterSelector.secondaryPropertyInUse();
	}

	#secondaryPropertyInterpretation: "length" | "end" = "length";
	secondaryPropertyInterpretation(): "length" | "end" {
		return this.savedState.useSecondaryPropertyAs;
	}

	interpretSecondaryPropertyAs(interpretation: "length" | "end") {
		this.savedState.useSecondaryPropertyAs = interpretation;
		this.saveState(this.savedState);
	}
}
