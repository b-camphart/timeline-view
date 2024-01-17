import type { TimelinePropertyCollection } from "./TimelineProperties";

export function getPropertyDisplayType(
	prop: string | undefined,
	availableProperties: TimelinePropertyCollection
): "numeric" | "date" {
	if (prop === undefined) {
		return "numeric";
	}
	if (prop.toLocaleLowerCase() === "created") {
		return "date";
	} else if (prop.toLocaleLowerCase() === "modified") {
		return "date";
	} else {
		const type = availableProperties.typeOf(prop);
		if (type === "date" || type === "datetime") {
			return "date";
		}
		return "numeric";
	}
}
