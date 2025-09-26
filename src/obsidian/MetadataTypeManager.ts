import * as obsidian from "obsidian";

// we mainly need the properties from obsidian for offering a list of available properties to use to the user 
// there's three possible ways to do this:
//   - using the metadataTypeManager property of the obsidian.App class (undocumented, private api)
//   - reading the raw types.json file (may not exist, unknown shape)
//   - manually scanning for all properties across the vault, and watching for changes

export async function getPropertyLister(app: obsidian.App): Promise<AnyPropertyLister> {
	const metadataTypeLister = MetadataTypeLister.initOrError(app)
	if (metadataTypeLister instanceof Error) {
		console.warn("[Timeline view]", metadataTypeLister);
	} else {
		return metadataTypeLister.asPropertyLister();
	}

	const types_file_lister = new TypesFilePropertyLister({ adapter: app.vault.adapter });
	const types_file_err_or_properties = await types_file_lister.listProperties()
	if (types_file_err_or_properties instanceof Error) {
		console.warn("[Timeline view]", types_file_err_or_properties);
	} else {
		return types_file_lister.asPropertyLister();
	}

	const collector = new VaultPropertyCollector(app);
	return collector.asPropertyLister();
}

// runtime interface
export class PropertyLister<Impl> {
	impl: Impl;
	listProperties: (this: PropertyLister<Impl>) => Promise<Error | Array<{ readonly name: string; readonly type: string; }>>;
	constructor(def: Pick<PropertyLister<Impl>, 'impl' | 'listProperties'>) {
		this.impl = def.impl;
		this.listProperties = def.listProperties;
	}
}
export type AnyPropertyLister = PropertyLister<any>;

class MetadataTypeLister {
	manager: MetadataTypeManager;
	constructor(def: Pick<MetadataTypeLister, "manager">) {
		this.manager = def.manager;
	}

	static async #listProperties(this: PropertyLister<MetadataTypeLister>) {
		return this.impl.listProperties();
	}

	listProperties() {
		return Object.entries(this.manager.properties).map(([name, prop]) => ({
			name,
			type: prop.widget,
		}));
	}

	asPropertyLister(this: MetadataTypeLister): PropertyLister<MetadataTypeLister> {
		return new PropertyLister({
			impl: this,
			listProperties: MetadataTypeLister.#listProperties,
		})
	}

	static initOrError(app: obsidian.App): MetadataTypeLister | Error {
		const manager = (app as any).metadataTypeManager;
		if (!manager) return new Error("obsidian.App does not have metadataTypeManager property")
		const err = new Error("obsidian.App.metadataTypeManager ")
		if (!isValidMetadataTypeManager(manager, (msg) => err.message += msg)) {
			return err;
		}
		return new MetadataTypeLister({ manager });
	}
}

/**
 * Property of obsidian that is undocumented.  Allows access to properties in
 * notes that the user has not registered
 */
export interface MetadataTypeManager {
	readonly properties: Record<string, Property>
	// there are other properties of this object, but we don't need them
}
function isValidMetadataTypeManager(suspect: unknown, on_invalid: (reason: string) => void): suspect is MetadataTypeManager {
	if (suspect == null) {
		on_invalid("null")
		return false;
	}
	if (typeof suspect !== "object") {
		on_invalid("not an object")
		return false;
	}

	if (!("properties" in suspect) || suspect.properties == null) {
		on_invalid("missing 'properties' property");
		return false;
	}
	if (typeof suspect.properties !== "object") {
		on_invalid("'properties' property is not an object")
		return false
	}

	for (const [property_name, property] of Object.entries(suspect.properties)) {
		if (!isValidProperty(property, (msg) => on_invalid(`properties.${property_name} ${msg}`))) {
			return false;
		}
	}

	return true;
}

export type Property = {
	readonly name: string;
	readonly widget: string;
	// there are other properties of this object, but we don't need them
};
function isValidProperty(suspect: unknown, on_invalid: (reason: string) => void): suspect is Property {
	if (suspect == null) {
		on_invalid("is null")
		return false;
	}
	if (typeof suspect !== "object") {
		on_invalid("is not an object")
		return false;
	}

	if (!("name" in suspect)) {
		on_invalid("missing 'name' property");
		return false;
	}
	if (typeof suspect.name !== "string") {
		on_invalid("'name' property is not a string")
		return false;
	}

	if (!("widget" in suspect)) {
		on_invalid("missing 'widget' property");
		return false;
	}
	if (typeof suspect.widget !== "string") {
		on_invalid("'widget' property is not a string")
		return false;
	}

	return true;
}

class TypesFilePropertyLister {
	adapter: obsidian.DataAdapter;
	constructor(def: Pick<TypesFilePropertyLister, 'adapter'>) {
		this.adapter = def.adapter;
	}

	static async #listProperties(this: PropertyLister<TypesFilePropertyLister>) {
		return this.impl.listProperties();
	}

	static readonly #path = ".obsidian/types.json";
	async listProperties(this: TypesFilePropertyLister) {
		let content: string;
		try {
			content = await this.adapter.read(obsidian.normalizePath(TypesFilePropertyLister.#path));
		} catch (e) {
			return new Error(`cannot read '${TypesFilePropertyLister.#path}' file`, { cause: e });
		}

		let json: unknown;
		try {
			json = JSON.parse(content)
		} catch (e) {
			return new Error(`cannot parse '${TypesFilePropertyLister.#path}'`, { cause: e });
		}

		let validation_error = new Error(`json content of '${TypesFilePropertyLister}' has incorrect shape: `)
		if (!isValidPropertyTypeJson(json, (msg) => validation_error.message += msg)) {
			return validation_error;
		}

		return Array.from(Object.entries(json.types)).map(([name, type]) => ({ name, type }));
	}

	asPropertyLister(this: TypesFilePropertyLister): PropertyLister<TypesFilePropertyLister> {
		return new PropertyLister({
			impl: this,
			listProperties: TypesFilePropertyLister.#listProperties,
		})
	}
}

function isValidPropertyTypeJson(suspect: unknown, on_invalid: (reason: string) => void): suspect is { types: Record<string, string> } {
	if (suspect == null) {
		on_invalid("null")
		return false;
	}
	if (typeof suspect !== "object") {
		on_invalid("not an object")
		return false;
	}

	if (!("types" in suspect) || suspect.types == null) {
		on_invalid("missing 'types' property")
		return false
	}

	if (typeof suspect.types !== "object") {
		on_invalid("'types' property is not an object")
		return false;
	}
	for (const entry of Object.entries(suspect.types)) {
		if (typeof entry[1] !== "string") {
			on_invalid(`${entry[0]} is not a string`)
			return false;
		}
	}

	return true;
}

class VaultPropertyCollector {
	vault: obsidian.Vault;
	metadataCache: obsidian.MetadataCache;
	constructor(def: Pick<VaultPropertyCollector, 'vault' | 'metadataCache'>) {
		this.vault = def.vault;
		this.metadataCache = def.metadataCache;
	}

	// looping through all the files is expensive, so we can use a cached value that is updated every second or so
	#cache: null | { time: number, properties: { name: string, type: string }[] } = null;
	collectProperties(this: VaultPropertyCollector) {
		if (this.#cache !== null && Date.now() - this.#cache.time < 1000) {
			return this.#cache.properties;
		}

		const files = this.vault.getMarkdownFiles();
		const properties = new Map<string, string>();
		for (const file of files) {
			const frontmatter = this.metadataCache.getFileCache(file)?.frontmatter
			if (frontmatter == null) continue;
			for (const [name, value] of Object.entries(frontmatter)) {
				if (properties.has(name) && properties.get(name) !== "?") continue;
				switch (typeof value) {
					case "string": {
						if (window.moment(value).isValid()) {
							properties.set(name, "date");
							continue;
						}
						properties.set(name, "text");
						continue;
					}
					case "number": properties.set(name, "number"); continue;
					default: properties.set(name, "?"); continue;
				}
			}
		}
		const cache = {
			time: Date.now(),
			properties: Array.from(properties).map(([name, type]) => ({ name, type })),
		};
		this.#cache = cache;
		return cache.properties;
	}

	static async #listProperties(this: PropertyLister<VaultPropertyCollector>) {
		return this.impl.collectProperties();
	}
	asPropertyLister(this: VaultPropertyCollector): PropertyLister<VaultPropertyCollector> {
		return new PropertyLister({
			impl: this,
			listProperties: VaultPropertyCollector.#listProperties,
		})
	}
}


