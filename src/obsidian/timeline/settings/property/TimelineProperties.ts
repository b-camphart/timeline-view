import type { NoteProperty } from "src/note/property";

export const TIMELINE_PROPERTY_TYPES = Object.freeze([
	"number",
	"date",
	"datetime",
] as const);

export type TimelinePropertyType = (typeof TIMELINE_PROPERTY_TYPES)[number];

export function isTimelineProperty(
	property: NoteProperty<string>
): property is NoteProperty<TimelinePropertyType> {
	return isTimelinePropertyType(property.type());
}

export function isTimelinePropertyType(
	type: string,
): type is TimelinePropertyType {
	return (TIMELINE_PROPERTY_TYPES as readonly string[]).includes(type);
}
