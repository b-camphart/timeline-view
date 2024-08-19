import type * as note from "src/note/repository";
import type * as query from "src/timeline/filter/query";
import type * as color from "src/color";
import * as json from "src/utils/json";
import * as filter from "src/note/filter";

export class TimelineGroup {
	private _color: string;

	constructor(notes: note.NoteRepository, query: string, color: string) {
		this._color = color;
		this._notes = notes;
		this._filter = notes.getExclusiveNoteFilterForQuery(query);
	}

	private _notes: note.NoteRepository;
	private _filter: filter.NoteFilter;

	noteFilter() {
		return this._filter;
	}

	query(): string {
		return this._filter.query();
	}

	filterByQuery(query: string) {
		this._filter = this._notes.getExclusiveNoteFilterForQuery(query);
		this.onChanged();
	}

	color(): string {
		return this._color;
	}

	recolor(color: string) {
		this._color = color;
		this.onChanged();
	}

	onChanged() {}
}
TimelineGroup.prototype satisfies query.QueryFilterReaderWriter;
TimelineGroup.prototype satisfies color.ColoredColorable;

export const schema = json.expectObject({
	query: json.expectString(""),
	color: json.expectString(""),
});

export type TimelineGroupJSON = json.Parsed<typeof schema>;
