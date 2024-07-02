import { normalizePath, type DataAdapter } from "obsidian";
import type { NotePropertyRepository } from "./repository";
import type { MetadataTypeManager } from "src/obsidian/MetadataTypeManager";
import { NoteProperty } from ".";

const REGISTERED_PROPERTY_JSON_PATH = normalizePath(`.obsidian/types.json`);
export class ObsidianNotePropertyRepository implements NotePropertyRepository {
	#getMetadataTypeManager: () => MetadataTypeManager | undefined;

	constructor(
		private fs: Pick<DataAdapter, "read">,
		getMetadataTypeManager: () => MetadataTypeManager | undefined,
	) {
		this.#getMetadataTypeManager = () => {
			const metadataTypeManager = getMetadataTypeManager();
			if (metadataTypeManager)
				this.#getMetadataTypeManager = () => metadataTypeManager;
			return metadataTypeManager;
		};
	}

	async getPropertyByName(
		name: string,
	): Promise<NoteProperty<string> | null> {
		if (name === NoteProperty.Created.name()) return NoteProperty.Created;
		if (name === NoteProperty.Modified.name()) return NoteProperty.Modified;

		const registeredProperties = await this.#loadRegisteredProperties();
		return registeredProperties.find(it => it.name() === name) ?? null;
	}

	async listPropertiesOfTypes<T extends string>(
		types: readonly T[],
	): Promise<NoteProperty<T>[]> {
		const unregisteredProperties =
			this.#getMetadataTypeManager()?.properties;

		if (unregisteredProperties) {
			const properties: NoteProperty<T>[] = [];
			if (types.includes(NoteProperty.Created.type() as T)) {
				properties.push(NoteProperty.Created as NoteProperty<T>);
			}
			if (types.includes(NoteProperty.Modified.type() as T)) {
				properties.push(NoteProperty.Modified as NoteProperty<T>);
			}
			for (const property of Object.values(unregisteredProperties)) {
				if (types.includes(property.type as T)) {
					properties.push(
						new NoteProperty<T>(property.name, property.type as T),
					);
				}
			}
			return properties;
		} else {
			const properties = (await this.#loadRegisteredProperties()).filter(
				(property): property is NoteProperty<T> =>
					types.includes(property.type() as T),
			);
			return properties;
		}
	}

	async #loadRegisteredProperties(): Promise<NoteProperty<string>[]> {
		let json: object = {};
		try {
			const rawText = await this.fs.read(REGISTERED_PROPERTY_JSON_PATH);
			json = JSON.parse(rawText);
		} catch (err) {
			console.error("[Timline View]", err);
		}

		const registeredProperties: NoteProperty<string>[] = [
			NoteProperty.Created,
			NoteProperty.Modified,
		];

		if (!("types" in json)) {
			return registeredProperties;
		}

		const types = json.types;
		if (types == null || typeof types !== "object") {
			return registeredProperties;
		}

		for (const [propertyName, maybePropertyType] of Object.entries(types)) {
			if (typeof maybePropertyType === "string") {
				registeredProperties.push(
					new NoteProperty(propertyName, maybePropertyType),
				);
			}
		}

		return registeredProperties;
	}
}
