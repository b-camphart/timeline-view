import type { Note } from "src/note";
import { NoteProperty } from "src/note/property";
import type { TimelinePropertyType } from "./TimelineProperties";

export interface FilePropertySelector {
	selectProperty(file: Note): number;
}

export function getPropertySelector(
	property: NoteProperty<TimelinePropertyType>,
): FilePropertySelector {
	if (property.name() === NoteProperty.Created.name()) {
		return FileCreationSelector;
	}
	if (property.name() === NoteProperty.Modified.name()) {
		return FileModificationSelector;
	}
	const type = property.type().toLocaleLowerCase();
	if (type === "date" || type === "datetime") {
		return new DatePropertySelector(property.name());
	}
	return new NumberPropertySelector(property.name());
}

export const NoPropertySelector: FilePropertySelector = {
	selectProperty(file: Note): number {
		return 0;
	},
};

export const FileCreationSelector: FilePropertySelector = {
	selectProperty(file: Note): number {
		return file.created();
	},
};

export const FileModificationSelector: FilePropertySelector = {
	selectProperty(file: Note): number {
		return file.modified();
	},
};

class DatePropertySelector implements FilePropertySelector {
	constructor(private property: string) {}

	selectProperty(file: Note): number {
		const metadata = file.properties();
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
		const metadata = file.properties();
		if (metadata == null) {
			return 0;
		}
		const value = metadata[this.property];
		if (value == null) return 0;
		if (typeof value === "string") {
			return parseFloat(value);
		}
		return value;
	}
}
