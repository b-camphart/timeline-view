import type {NotePropertyRepository} from "./repository";
import type {MetadataTypeManager} from "src/obsidian/MetadataTypeManager";
import {NoteProperty} from ".";

export class ObsidianNotePropertyRepository implements NotePropertyRepository {
	#getMetadataTypeManager: () => MetadataTypeManager | undefined;

	constructor(
		private readPropertyTypes: () => Promise<string>,
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
			const rawText = await this.readPropertyTypes();
			json = JSON.parse(rawText);
		} catch (err) {
			console.error("[Timeline View]", err);
		}

		const registeredProperties: NoteProperty<string>[] = [];

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
