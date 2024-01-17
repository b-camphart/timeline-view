import type { PropertyCollection } from "src/obsidian/properties/Properties";
import type { Note } from "src/obsidian/files/Note";

export interface FilePropertySelector {
	selectProperty(file: Note): number;
}

export function getPropertySelector(
	prop: string | undefined,
	availableProperties: PropertyCollection,
): FilePropertySelector {
	if (prop === undefined) {
		return NoPropertySelector;
	}
	if (prop.toLocaleLowerCase() === "created") {
		return FileCreationSelector;
	}
	if (prop.toLocaleLowerCase() === "modified") {
		return FileModificationSelector;
	}
	const type = availableProperties.typeOf(prop);
	if (type === "date" || type === "datetime") {
		return new DatePropertySelector(prop);
	}
	return new NumberPropertySelector(prop);
}

export const NoPropertySelector: FilePropertySelector = {
	selectProperty(file: Note): number {
		return 0;
	},
};

export const FileCreationSelector: FilePropertySelector = {
	selectProperty(file: Note): number {
		return file.createdAt();
	},
};

export const FileModificationSelector: FilePropertySelector = {
	selectProperty(file: Note): number {
		return file.modifiedAt();
	},
};

class DatePropertySelector implements FilePropertySelector {
	constructor(private property: string) {}

	selectProperty(file: Note): number {
		const metadata = file.metadata();
		if (metadata == null) {
			return 0;
		}
		const value = metadata[this.property];
		if (value == null) return 0;
		const date = new Date(value);
		const valueOf = date.valueOf();
		return valueOf;
	}
}

class NumberPropertySelector implements FilePropertySelector {
	constructor(private property: string) {}

	selectProperty(file: Note): number {
		const metadata = file.metadata();
		if (metadata == null) {
			return 0;
		}
		const value = metadata[this.property];
		if (value == null) return 0;
		if (typeof value === "string") {
			return parseInt(value);
		}
		return value;
	}
}
