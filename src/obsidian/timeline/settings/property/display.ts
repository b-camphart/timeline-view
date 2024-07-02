import type { NoteProperty } from "src/note/property";
import type { TimelinePropertyType } from "./TimelineProperties";

export function getPropertyDisplayType(
	property: NoteProperty<TimelinePropertyType>
): "numeric" | "date" {
	const type = property.type().toLocaleLowerCase();
	if (type === "date" || type === "datetime") {
		return "date";
	}
	return "numeric"
}