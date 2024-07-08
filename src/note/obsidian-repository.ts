import type { MetadataCache, TFile, Vault } from "obsidian";
import type { Note } from "src/note";
import type { NoteRepository } from "src/note/repository";
import {
	EmtpyFilter,
	MatchNone,
	parse,
	type FileFilter,
} from "obsidian-search";
import { MatchAllEmptyQuery } from "src/obsidian/timeline/settings/filter/DefaultFileFilter";
import type { NoteFilter } from "src/note/filter";

export class ObsidianNoteRepository implements NoteRepository {
	#files;
	#metadata;

	constructor(
		files: Pick<Vault, "getMarkdownFiles">,
		metadata: MetadataCache,
	) {
		this.#files = files;
		this.#metadata = metadata;
	}

	getNoteForFile(file: TFile): Note {
		return new ObsidianNote(file, this.#metadata);	
	}

	getFileFromNote(note: Note): TFile | null {
		if (note instanceof ObsidianNote) {
			return note.file();
		}
		return null;
	}

	listAll(): Promise<Note[]> {
		return Promise.resolve(
			this.#files
				.getMarkdownFiles()
				.map(tFile => new ObsidianNote(tFile, this.#metadata)),
		);
	}

	async listAllMatchingQuery(query: string): Promise<{
		notes: Note[];
		filter: NoteFilter;
	}> {
		const filter = parse(query, this.#metadata, MatchAllEmptyQuery);

		const notes = (
			await Promise.all(
				this.#files.getMarkdownFiles().map(async tFile => {
					if (!(await filter.appliesTo(tFile))) {
						return new ObsidianNote(tFile, this.#metadata);
					}
				}),
			)
		).filter((note): note is ObsidianNote => !!note);

		return {
			filter: new ObsidianNoteFilter(filter, query),
			notes,
		};
	}

	getNoteFilterForQuery(query: string): NoteFilter {
		return new ObsidianNoteFilter(
			parse(query, this.#metadata, MatchAllEmptyQuery),
			query,
		);
	}

	getInclusiveNoteFilterForQuery(query: string): NoteFilter {
		return new ObsidianNoteFilter(
			parse(query, this.#metadata, MatchAllEmptyQuery),
			query,
		);
	}

	getExclusiveNoteFilterForQuery(query: string): NoteFilter {
		return new ObsidianNoteFilter(
			parse(query, this.#metadata, EmtpyFilter),
			query,
		);
	}
}

class ObsidianNoteFilter implements NoteFilter {
	#filter;

	constructor(filter: FileFilter, query: string) {
		this.#filter = filter;
		this.#query = query;
	}

	#query;
	query(): string {
		return this.#query;
	}

	async matches(note: Note): Promise<boolean> {
		if (note instanceof ObsidianNote) {
			return await this.#filter.appliesTo(note.file());
		}
		return false;
	}
}

export class ObsidianNote implements Note {
	#tFile;
	#metadata;

	constructor(tFile: TFile, metadata: MetadataCache) {
		this.#tFile = tFile;
		this.#metadata = metadata;
	}

	id(): string {
		return this.#tFile.path;
	}

	file(): TFile {
		return this.#tFile;
	}

	name(): string {
		return this.#tFile.basename;
	}

	created(): number {
		return this.#tFile.stat.ctime;
	}

	modified(): number {
		return this.#tFile.stat.mtime;
	}

	properties(): Record<string, any> {
		return this.#metadata.getFileCache(this.#tFile)?.frontmatter ?? {};
	}
}
