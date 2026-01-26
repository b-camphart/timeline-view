import { NotePropertyRepository } from "./repository";
import { getPropertyLister, type AnyPropertyLister } from "src/obsidian/MetadataTypeManager";
import { NoteProperty } from ".";
import type { App } from "obsidian";

export class ObsidianNotePropertyRepository {
	#property_lister

	constructor(app: App) {
		this.#property_lister = new Promise<AnyPropertyLister>(resolve => {
			app.workspace.onLayoutReady(async () => {
				resolve(await getPropertyLister(app));
			})
		});
	}

	async #listProperties() {
		return (await this.#property_lister).listProperties();
	}

	async getPropertyByName(
		this: ObsidianNotePropertyRepository,
		name: string,
	): Promise<NoteProperty<string> | null | Error> {
		const properties_or_err = await this.#listProperties();
		if (properties_or_err instanceof Error) {
			return properties_or_err;
		}

		const property = properties_or_err.find(it => it.name === name)
		if (property == null) return null;
		return new NoteProperty(property.name, property.type);
	}

	async listPropertiesOfTypes<T extends string>(
		this: ObsidianNotePropertyRepository,
		types: readonly T[],
	): Promise<NoteProperty<T>[] | Error> {
		const properties_or_err = await this.#listProperties();
		if (properties_or_err instanceof Error) {
			return properties_or_err;
		}

		const properties: NoteProperty<T>[] = [];
		for (const { name, type } of properties_or_err) {
			if (types.includes(type as T)) {
				properties.push(new NoteProperty<T>(name, type as T));
			}
		}
		return properties;
	}

	static #NotePropertyRepository = Object.freeze({
		listPropertiesOfTypes<T extends string>(this: NotePropertyRepository<ObsidianNotePropertyRepository>, types: readonly T[]) {
			return this.impl.listPropertiesOfTypes(types);
		},
		getPropertyByName(this: NotePropertyRepository<ObsidianNotePropertyRepository>, name: string) {
			return this.impl.getPropertyByName(name);
		}
	})
	asNotePropertyRepository(this: ObsidianNotePropertyRepository): NotePropertyRepository<ObsidianNotePropertyRepository> {
		return new NotePropertyRepository({
			impl: this,
			listPropertiesOfTypes: ObsidianNotePropertyRepository.#NotePropertyRepository.listPropertiesOfTypes,
			getPropertyByName: ObsidianNotePropertyRepository.#NotePropertyRepository.getPropertyByName,
		})
	}
}
