import type { MetadataCache, TFile, Vault } from "obsidian";
import type { Unsubscribe } from "../Events";
import { isTypeOfProperty, type PropertyType } from "./types";

type Property = {
	readonly name: string;
	readonly type: PropertyType;
};

export const CREATED_PROPERTY = Object.freeze({
	name: "created",
	type: "datetime",
} as const) satisfies Property;
export const MODIFIED_PROPERTY = Object.freeze({
	name: "modified",
	type: "datetime",
} as const) satisfies Property;

type KNOWN_PROPERTY_NAMES = readonly [
	typeof CREATED_PROPERTY.name,
	typeof MODIFIED_PROPERTY.name
];
type KNOWN_PROPERTY_LIST = readonly [
	typeof CREATED_PROPERTY,
	typeof MODIFIED_PROPERTY
];
type KNOWN_PROPERTY_RECORD = {
	readonly created: typeof CREATED_PROPERTY.type;
	readonly modified: typeof MODIFIED_PROPERTY.type;
};

export interface PropertyCollection {
	has(name: typeof CREATED_PROPERTY.name): true;
	has(name: typeof MODIFIED_PROPERTY.name): true;
	has(name: string): boolean;

	typeOf(name: string): PropertyType | undefined;
	typeOf(name: typeof CREATED_PROPERTY.name): typeof CREATED_PROPERTY.type;
	typeOf(name: typeof MODIFIED_PROPERTY.name): typeof MODIFIED_PROPERTY.type;

	names(): readonly string[] & KNOWN_PROPERTY_NAMES;
	list(): readonly Property[] & KNOWN_PROPERTY_LIST;

	toMutable(): MutablePropertyCollection;
	asMutable(): MutablePropertyCollection;
	asReadOnly(): PropertyCollection;
}

export interface MutablePropertyCollection extends PropertyCollection {
	add(name: string, type: PropertyType): void;
	addProperty(property: Property): void;
	replace(name: string, type: PropertyType): boolean;
	remove(name: string): boolean;

	toReadOnly(): PropertyCollection;
}

export interface Properties {
	listKnownProperties(): PropertyCollection;
	on(
		eventType: "property-created",
		listener: (propertyName: string, type: PropertyType) => void
	): Unsubscribe;
	on(
		eventType: "property-type-changed",
		listener: (
			propertyName: string,
			oldType: PropertyType,
			newType: PropertyType
		) => void
	): Unsubscribe;
	on(
		eventType: "property-removed",
		listener: (propertyName: string, type: PropertyType) => void
	): Unsubscribe;
}

export interface MetadataProperties extends Properties {
	metadataChanged(file: TFile): void;
}

export function properties(
	vault: Vault,
	metadataCache: MetadataCache
): MetadataProperties {
	return new ObsidianProperties(vault, metadataCache);
}

type PropertyEvent =
	| "property-created"
	| "property-type-changed"
	| "property-removed";

class ObsidianProperties implements MetadataProperties {
	private subscriptions = {
		"property-created": [] as ((
			propertyName: string,
			type: PropertyType
		) => void)[],
		"property-type-changed": [] as ((
			propertyName: string,
			oldType: PropertyType,
			newType: PropertyType
		) => void)[],
		"property-removed": [] as ((
			propertyName: string,
			type: PropertyType
		) => void)[],
	} as const;

	private knownProperties: MutablePropertyCollection;

	constructor(private vault: Vault, private metadataCache: MetadataCache) {
		this.knownProperties = new MutablePropertyCollectionImpl({ created: 'datetime', modified: 'datetime' })
		loadRegisteredTypes(vault).then((registeredTypes) => {
			this.knownProperties = registeredTypes.asMutable();
		});
	}

	metadataChanged(file: TFile) {
		const knownProperties = this.knownProperties;
		if (knownProperties == null) {
			return;
		}
		// look to see if file has any new properties we haven't seen before
		const metadata = this.metadataCache.getFileCache(file);
		if (metadata == null) {
			return;
		}
		if (metadata.frontmatter == null) {
			return;
		}
		for (const propertyName of Object.keys(metadata.frontmatter)) {
			if (!(propertyName in knownProperties)) {
				this.loadRegisteredTypes();
				break;
			}
		}
	}

	private async loadRegisteredTypes() {
		const knownProperties = this.listKnownProperties();
		const newTypes = (await loadRegisteredTypes(this.vault)).asMutable()

		let events: (() => void)[] = [];

		for (const property of newTypes.list()) {
			if (knownProperties.has(property.name)) {
				const oldType = knownProperties.typeOf(property.name)!;
				if (property.type != oldType) {
					events.push(() => {
						this.subscriptions["property-type-changed"].forEach(
							(subscription) => {
								subscription(property.name, oldType, property.type);
							}
						);
					});
				}
			} else {
				events.push(() => {
					this.subscriptions["property-created"].forEach(
						(subscription) => {
							subscription(property.name, property.type);
						}
					);
				});
			}
		}

		for (const property of knownProperties.list()) {
			if (! newTypes.has(property.name)) {
				events.push(() => {
					this.subscriptions["property-removed"].forEach(
						(subscription) => {
							subscription(property.name, property.type);
						}
					);
				});
			}
		}

		this.knownProperties = newTypes;

		events.forEach((event) => event());
	}

	listKnownProperties(): PropertyCollection {
		return this.knownProperties;
	}

	on(
		eventType: "property-created",
		listener: (propertyName: string, type: PropertyType) => void
	): Unsubscribe;
	on(
		eventType: "property-type-changed",
		listener: (
			propertyName: string,
			oldType: PropertyType,
			newType: PropertyType
		) => void
	): Unsubscribe;
	on(
		eventType: "property-removed",
		listener: (propertyName: string, type: PropertyType) => void
	): Unsubscribe;
	on(eventType: PropertyEvent, listener: any): Unsubscribe {
		const subscriptions = this.subscriptions[eventType];
		subscriptions.push(listener);
		return () => {
			subscriptions.remove(listener);
		};
	}
}

export async function loadRegisteredTypes(
	vault: Vault
): Promise<PropertyCollection> {
	const registeredTypes: MutablePropertyCollection =
		new MutablePropertyCollectionImpl({
			created: "datetime",
			modified: "datetime",
		});
	const rawText = await vault.adapter.read(`.obsidian/types.json`);
	const json: object = JSON.parse(rawText);
	if (!("types" in json)) {
		return registeredTypes;
	}
	const types = json.types;
	if (types === null || typeof types !== "object") {
		return registeredTypes;
	}
	for (const [propertyName, maybePropertyType] of Object.entries(types)) {
		if (isTypeOfProperty(maybePropertyType)) {
			registeredTypes.add(propertyName, maybePropertyType);
		}
	}
	return registeredTypes;
}

export function filterByType(
	properties: PropertyCollection,
	includedTypes: readonly PropertyType[]
): PropertyCollection {
	let allMatch = true;
	const allProperties = properties.list();
	for (const property of allProperties) {
		if (!includedTypes.includes(property.type)) {
			allMatch = false;
			break;
		}
	}
	if (allMatch) {
		return properties;
	}
	const subset = properties.toMutable();
	for (const property of allProperties) {
		if (!includedTypes.includes(property.type)) {
			subset.remove(property.name);
		}
	}
	return subset;
}

class PropertyCollectionImpl implements PropertyCollection {
	constructor(
		private readonly properties: KNOWN_PROPERTY_RECORD &
			Record<string, PropertyType>
	) {}

	has(name: "created"): true;
	has(name: "modified"): true;
	has(name: string): boolean;
	has(name: string): boolean {
		return name in this.properties;
	}
	typeOf(name: string): PropertyType | undefined;
	typeOf(name: "created"): "datetime";
	typeOf(name: "modified"): "datetime";
	typeOf(name: string): PropertyType | undefined {
		return this.properties[name];
	}

	private keys(): readonly string[] {
		return Object.keys(this.properties);
	}

	names(): ReturnType<PropertyCollection["names"]> {
		return this.keys() as ReturnType<PropertyCollection["names"]>;
	}

	list(): ReturnType<PropertyCollection["list"]> {
		const properties: KNOWN_PROPERTY_LIST & Property[] = [
			CREATED_PROPERTY,
			MODIFIED_PROPERTY,
		];
		for (const name of this.names()) {
			if (name === "created" || name === "modified") continue;
			const property: Property = { name, type: this.properties[name] };
			properties.push(property);
		}
		return properties;
	}

	toMutable(): MutablePropertyCollection {
		return new MutablePropertyCollectionImpl({ ...this.properties });
	}

	asMutable(): MutablePropertyCollection {
		return this.toMutable();
	}

	asReadOnly(): PropertyCollection {
		return this;
	}
}

class MutablePropertyCollectionImpl
	extends PropertyCollectionImpl
	implements MutablePropertyCollection
{
	constructor(
		private readonly mutableProperties: KNOWN_PROPERTY_RECORD & {
			[name: string]: PropertyType;
		}
	) {
		super(mutableProperties);
	}

	add(name: string, type: PropertyType): void {
		if (name === "created" || name === "modified") {
			return;
		}

		this.mutableProperties[name] = type;
	}
	addProperty(property: Property): void {
		this.add(property.name, property.type);
	}
	replace(name: string, type: PropertyType): boolean {
		if (this.remove(name)) {
			this.add(name, type);
			return true;
		}
		return false;
	}
	remove(name: string): boolean {
		if (name === "created" || name === "modified") {
			return false;
		}

		if (!this.has(name)) {
			return false;
		}

		delete this.mutableProperties[name];
		return true;
	}

	toReadOnly(): PropertyCollection {
		return new PropertyCollectionImpl({ ...this.mutableProperties });
	}

	asMutable(): MutablePropertyCollection {
		return this;
	}
}
