import type {FileManager, MetadataCache, TFile, Vault} from "obsidian";
import type {Note} from "src/note";
import type {MutableNoteRepository} from "src/note/repository";
import {EmtpyFilter, parse, type FileFilter} from "obsidian-search";
import type {NoteFilter} from "src/note/filter";
import {truncate} from "src/utils/number";
import {exists} from "src/utils/null";

export class ObsidianNoteRepository implements MutableNoteRepository {
	#vault;
	#metadata;
	#files;

	constructor(
		vault: Pick<Vault, "getMarkdownFiles" | "create" | "adapter">,
		metadata: MetadataCache,
		files: Pick<FileManager, "processFrontMatter">,
	) {
		this.#vault = vault;
		this.#metadata = metadata;
		this.#files = files;
	}

	async createNote(note: {created?: number; modified?: number; properties?: Record<string, unknown>}): Promise<Note> {
		let count = 0;
		let name = "Untitled.md";
		while (await this.#vault.adapter.exists(name)) {
			count++;
			name = `Untitled ${count}.md`;
		}
		const tFile = await this.#vault.create(name, "", {
			ctime: truncate(note.created),
			mtime: truncate(note.modified),
		});
		if (note.properties) {
			this.#files.processFrontMatter(tFile, frontmatter => {
				Object.assign(frontmatter, note.properties);
			});
		}
		return new ObsidianNote(tFile, this.#metadata);
	}

	async modifyNote(
		note: Note,
		modification: {
			created?: number;
			modified?: number;
			properties?: {[name: string]: unknown};
		},
	) {
		const tFile = this.getFileFromNote(note);
		if (tFile == null) {
			return;
		}

		if (modification.created != null || modification.modified != null) {
			// just modifying the tFile.ctime and tFile.mtime didn't actually
			// persist the changes.  Writing is the only way to do so.
			await this.#vault.adapter.write(tFile.path, await this.#vault.adapter.read(tFile.path), {
				ctime: truncate(modification.created),
				mtime: truncate(modification.modified),
			});
		}
		if (modification.properties != null) {
			const properties = modification.properties;
			await this.#files.processFrontMatter(tFile, frontmatter => {
				for (const [key, value] of Object.entries(properties)) {
					frontmatter[key] = value;
				}
			});
		}
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

	listAll(): Iterable<Note> {
		const vault = this.#vault;
		const metadata = this.#metadata;
		return (function* () {
			for (const tFile of vault.getMarkdownFiles()) {
				yield new ObsidianNote(tFile, metadata);
			}
		})();
	}

	async listAllMatchingFilter(filter: NoteFilter): Promise<ObsidianNote[]> {
		const vault = this.#vault;
		const metadata = this.#metadata;

		const processFile =
			filter instanceof ObsidianNoteFilter
				? async (tFile: TFile) => {
						if (await filter.fileFilter().appliesTo(tFile)) {
							return new ObsidianNote(tFile, metadata);
						}
						return null;
				  }
				: async (tFile: TFile) => {
						const note = new ObsidianNote(tFile, metadata);
						if (await filter.matches(note)) {
							return note;
						}
						return null;
				  };

		const notesOrNull = await Promise.all(vault.getMarkdownFiles().map(processFile));
		return notesOrNull.filter(exists);
	}

	getNoteFilterForQuery(query: string): NoteFilter {
		return new ObsidianNoteFilter(parse(query, this.#metadata, MatchAllEmptyQuery), query);
	}

	getInclusiveNoteFilterForQuery(query: string): NoteFilter {
		return new ObsidianNoteFilter(parse(query, this.#metadata, MatchAllEmptyQuery), query);
	}

	getExclusiveNoteFilterForQuery(query: string): NoteFilter {
		return new ObsidianNoteFilter(parse(query, this.#metadata, EmtpyFilter), query);
	}
}

class ObsidianNoteFilter implements NoteFilter {
	#filter;

	constructor(filter: FileFilter, query: string) {
		this.#filter = filter;
		this.#query = query;
	}

	fileFilter() {
		return this.#filter;
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

	constructor(tFile: TFile, metadata: Pick<MetadataCache, "getFileCache">) {
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

	properties(): Record<string, unknown> {
		return this.#metadata.getFileCache(this.#tFile)?.frontmatter ?? {};
	}
}

export const MatchAllEmptyQuery: FileFilter = {
	async appliesTo(file) {
		return true;
	},
	and(filter) {
		return filter;
	},
	or(filter) {
		return filter;
	},
};
