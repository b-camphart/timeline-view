import {
	filterByType,
	type MutablePropertyCollection,
	type Properties,
	type PropertyCollection,
} from "src/obsidian/properties/Properties";
import {
	TIMELINE_PROPERTY_TYPES,
	isTimelinePropertyType,
	type TimelinePropertyCollection,
} from "src/obsidian/timeline/settings/property/TimelineProperties";
import { writable, type Readable, type Writable } from "svelte/store";

let timelineProperties: Readable<TimelinePropertyCollection>;

export function timelineFileProperties(
	properties: Properties
): import("svelte/store").Readable<TimelinePropertyCollection> {
	if (timelineProperties) {
		return timelineProperties;
	}

	const availableProperties = writable<MutablePropertyCollection>(
		filterByType(properties.listKnownProperties(), TIMELINE_PROPERTY_TYPES).asMutable()
	);

	properties.on("property-created", (name, type) => {
		if (isTimelinePropertyType(type)) {
			availableProperties.update((availableProperties) => {
				availableProperties.add(name, type);
				return availableProperties;
			});
		}
	});

	properties.on("property-type-changed", (name, type) => {
		availableProperties.update((availableProperties) => {
			if (isTimelinePropertyType(type)) {
				availableProperties.replace(name, type);
			} else {
                availableProperties.remove(name)
            }
			return availableProperties;
		});
	});

	properties.on("property-removed", (name) => {
		availableProperties.update((availableProperties) => {
            availableProperties.remove(name)
			return availableProperties;
		});
	});

	timelineProperties = availableProperties as Writable<PropertyCollection> as Writable<TimelinePropertyCollection>;

	return timelineProperties;
}
