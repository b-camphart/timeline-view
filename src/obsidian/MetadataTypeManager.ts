import type {App} from "obsidian";

/**
 * Property of obsidian that is undocumented.  Allows access to properties in
 * notes that the user has not registered
 */
export interface MetadataTypeManager {
	readonly properties: Readonly<
		{
			aliases: Property;
			cssclasses: Property;
			tags: Property;
		} & Record<string, Property>
	>;
	readonly types: Readonly<
		{
			aliases: PropertyType;
			cssclasses: PropertyType;
			tags: PropertyType;
		} & Record<string, PropertyType>
	>;
}

export type Property = {
	readonly name: string;
	readonly type: string;
	readonly count: number;
};

export type PropertyType = {
	readonly name: string;
	readonly type: string;
};

export function getMetadataTypeManager(
	app: App,
): MetadataTypeManager | undefined {
	const metadataTypeManager =
		"metadataTypeManager" in app ? app.metadataTypeManager : undefined;
	if (!metadataTypeManager) {
		console.warn(
			`[Timeline View] Could not find metadataTypeManager in app`,
		);
		return undefined;
	}
	if (typeof metadataTypeManager !== "object") {
		console.warn(
			`[Timeline View] MetadataTypeManager is not an object in app`,
		);
		return undefined;
	}

	if (!validMetadataTypeManager(metadataTypeManager)) {
		console.warn(
			`[Timeline View] MetadataTypeManager is not of expected shape in app`,
		);
		return undefined;
	}

	return metadataTypeManager;
}

function validMetadataTypeManager(
	metadataTypeManager: object,
): metadataTypeManager is MetadataTypeManager {
	if (
		!("properties" in metadataTypeManager) ||
		!metadataTypeManager.properties
	) {
		console.warn(
			`[Timeline View] MetadataTypeManager does not have properties`,
		);
		return false;
	}
	if (typeof metadataTypeManager.properties !== "object") {
		console.warn(
			`[Timeline View] MetadataTypeManager.properties is not an object`,
		);
		return false;
	}
	if (!validMetadataTypeProperties(metadataTypeManager.properties)) {
		console.warn(
			`[Timeline View] MetadataTypeManager.properties is not of expected shape`,
		);
		return false;
	}

	if (!("types" in metadataTypeManager) || !metadataTypeManager.types) {
		console.warn(`[Timeline View] MetadataTypeManager does not have types`);
		return false;
	}
	if (typeof metadataTypeManager.types !== "object") {
		console.warn(
			`[Timeline View] MetadataTypeManager.types is not an object`,
		);
		return false;
	}
	if (!validMetadataTypeTypes(metadataTypeManager.types)) {
		console.warn(
			`[Timeline View] MetadataTypeManager.types is not of expected shape`,
		);
		return false;
	}

	return true;
}

function validMetadataTypeProperties(
	properties: object,
): properties is MetadataTypeManager["properties"] {
	if (!("aliases" in properties) || properties.aliases === null) {
		console.warn(
			`[Timeline View] MetadataTypeManager.properties.aliases is null or undefined`,
		);
		return false;
	}
	if (!validProperty("aliases", properties.aliases)) {
		console.warn(
			`[Timeline View] MetadataTypeManager.properties.aliases is not of expected shape`,
		);
		return false;
	}
	properties.aliases satisfies MetadataTypeManager["properties"]["aliases"];

	if (!("cssclasses" in properties) || properties.cssclasses === null) {
		console.warn(
			`[Timeline View] MetadataTypeManager.properties.cssclasses is null or undefined`,
		);
		return false;
	}
	if (!validProperty("cssclasses", properties.cssclasses)) {
		console.warn(
			`[Timeline View] MetadataTypeManager.properties.cssclasses is not of expected shape`,
		);
		return false;
	}
	properties.cssclasses satisfies MetadataTypeManager["properties"]["cssclasses"];

	if (!("tags" in properties) || properties.tags === null) {
		console.warn(
			`[Timeline View] MetadataTypeManager.properties.tags is null or undefined`,
		);
		return false;
	}
	if (!validProperty("tags", properties.tags)) {
		console.warn(
			`[Timeline View] MetadataTypeManager.properties.tags is not of expected shape`,
		);
		return false;
	}
	properties.tags satisfies MetadataTypeManager["properties"]["tags"];

	for (const [key, value] of Object.entries(properties)) {
		if (!validProperty(key, value)) {
			return false;
		}
	}

	return true;
}

function validProperty(name: string, property: unknown): property is Property {
	if (typeof property !== "object" || property === null) {
		return false;
	}
	if (
		!("name" in property) ||
		!("type" in property) ||
		!("count" in property)
	) {
		return false;
	}
	if (typeof property.name !== "string") {
		return false;
	}
	if (typeof property.type !== "string") {
		return false;
	}
	if (typeof property.count !== "number") {
		return false;
	}
	return true;
}

function validMetadataTypeTypes(
	types: object,
): types is MetadataTypeManager["types"] {
	if (
		!("aliases" in types) ||
		!("cssclasses" in types) ||
		!("tags" in types)
	) {
		return false;
	}

	if (
		!validPropertyType("aliases", types.aliases) &&
		!validPropertyType("cssclasses", types.cssclasses) &&
		!validPropertyType("tags", types.tags)
	) {
		return false;
	}

	for (const [key, value] of Object.entries(types)) {
		if (!validPropertyType(key, value)) {
			return false;
		}
	}

	return true;
}

function validPropertyType(name: string, type: unknown): type is PropertyType {
	if (typeof type !== "object" || type === null) {
		return false;
	}
	if (!("name" in type) || !("type" in type)) {
		return false;
	}
	if (typeof type.name !== "string") {
		return false;
	}
	if (typeof type.type !== "string") {
		return false;
	}
	return true;
}
