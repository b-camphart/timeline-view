import {
	type PropertyCollection,
	CREATED_PROPERTY,
	MODIFIED_PROPERTY,
} from "src/obsidian/properties/Properties";

export const TIMELINE_PROPERTY_TYPES = Object.freeze([
	"number",
	"date",
	"datetime",
] as const);

export type TimelinePropertyType = (typeof TIMELINE_PROPERTY_TYPES)[number];

export function isTimelinePropertyType(
	type: string
): type is TimelinePropertyType {
	return (TIMELINE_PROPERTY_TYPES as readonly string[]).includes(type);
}

type TimelineProperty = {
	readonly name: string;
	readonly type: TimelinePropertyType;
};

export interface TimelinePropertyCollection extends PropertyCollection {
	typeOf(name: typeof CREATED_PROPERTY.name): typeof CREATED_PROPERTY.type;
	typeOf(name: typeof MODIFIED_PROPERTY.name): typeof MODIFIED_PROPERTY.type;
	/**
	 * @override from {@link PropertyCollection.typeOf}
	 */
	typeOf(name: string): TimelinePropertyType | undefined;

	/**
	 * @override from {@link PropertyCollection.list}
	 */
	list(): readonly TimelineProperty[] &
		[typeof CREATED_PROPERTY, typeof MODIFIED_PROPERTY];
}
