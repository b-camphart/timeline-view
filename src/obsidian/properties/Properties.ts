import type { MetadataCache, TFile, Vault } from "obsidian";
import type { Unsubscribe } from "../Events";

const propertyTypes = ["aliases", "multitext", "tags", "datetime", "date", "number", "checkbox", "text"] as const;
export type PropertyType = typeof propertyTypes[number];
export function isValidPropertyType(type: string): type is PropertyType {
    return propertyTypes.includes(type as any)
}

const ALWAYS_AVAILABLE_PROPERTIES = Object.freeze({ "created": "datetime", "modified": "datetime" } as const);

export type RegisteredTypes = typeof ALWAYS_AVAILABLE_PROPERTIES & { [propertyName: string]: PropertyType };

export interface Properties {

    listKnownProperties(): RegisteredTypes
    on(eventType: "property-created", listener: (propertyName: string, type: PropertyType) => void): Unsubscribe;
    on(eventType: "property-type-changed", listener: (propertyName: string, oldType: PropertyType, newType: PropertyType) => void): Unsubscribe;
    on(eventType: "property-removed", listener: (propertyName: string, type: PropertyType) => void): Unsubscribe;

}

export interface MetadataProperties extends Properties {
    metadataChanged(file: TFile): void;
}

export function properties(
    vault: Vault,
    metadataCache: MetadataCache,
): MetadataProperties {
    return new ObsidianProperties(vault, metadataCache);
}

type PropertyEvent = 'property-created' | 'property-type-changed' | 'property-removed';

class ObsidianProperties implements MetadataProperties {

    private subscriptions = {
        "property-created": [] as ((propertyName: string, type: PropertyType) => void)[],
        "property-type-changed": [] as ((propertyName: string, oldType: PropertyType, newType: PropertyType) => void)[],
        "property-removed": [] as ( (propertyName: string, type: PropertyType) => void)[]
    } as const;

    private knownProperties: RegisteredTypes;

    constructor(
        private vault: Vault,
        private metadataCache: MetadataCache,
    ) {
        this.knownProperties = ALWAYS_AVAILABLE_PROPERTIES;
        loadRegisteredTypes(vault).then(registeredTypes => { this.knownProperties = registeredTypes });
    }

    metadataChanged(file: TFile) {
        const knownProperties = this.knownProperties
        if (knownProperties == null) {
             return;
        }
        // look to see if file has any new properties we haven't seen before
        const metadata = this.metadataCache.getFileCache(file)
        if (metadata == null) {
            return
        }
        if (metadata.frontmatter == null) {
            return;
        }
        for (const propertyName of Object.keys(metadata.frontmatter)) {
            if (! (propertyName in knownProperties)) {
                this.loadRegisteredTypes();
                break;
            }
        }
    }

    private async loadRegisteredTypes() {
        const knownProperties = this.listKnownProperties();
        const newTypes = await loadRegisteredTypes(this.vault);

        let events: (() => void)[] = []

        for (const propertyName of Object.keys(newTypes)) {
            const newType = newTypes[propertyName];
            if (propertyName in knownProperties) {
                const oldType = knownProperties[propertyName];
                if (newType != oldType) {
                    events.push(() => {
                        this.subscriptions["property-type-changed"].forEach(subscription => {
                            subscription(propertyName, oldType, newType)
                        })
                    })
                }
            } else {
                events.push(() => {
                    this.subscriptions["property-created"].forEach(subscription => {
                        subscription(propertyName, newType)
                    })
                })
            }
        }

        for (const propertyName of Object.keys(knownProperties)) {
            if (! (propertyName in newTypes)) {
                const type = knownProperties[propertyName]
                events.push(() => {
                    this.subscriptions["property-removed"].forEach(subscription => {
                        subscription(propertyName, type)
                    })
                })
            }
        }

        this.knownProperties = newTypes;

        events.forEach(event => event());

    }

    listKnownProperties(): RegisteredTypes {
        return this.knownProperties;
    }

    on(eventType: "property-created", listener: (propertyName: string, type: PropertyType) => void): Unsubscribe;
    on(eventType: "property-type-changed", listener: (propertyName: string, oldType: PropertyType, newType: PropertyType) => void): Unsubscribe;
    on(eventType: "property-removed", listener: (propertyName: string, type: PropertyType) => void): Unsubscribe;
    on(eventType: PropertyEvent, listener: any): Unsubscribe {
        const subscriptions = this.subscriptions[eventType];
        subscriptions.push(listener);
        return () => {
            subscriptions.remove(listener);
        }
    }

}

export async function loadRegisteredTypes(vault: Vault): Promise<RegisteredTypes> {
    const registeredTypes: RegisteredTypes = {...ALWAYS_AVAILABLE_PROPERTIES};
    const rawText = await vault.adapter.read(`.obsidian/types.json`)
    const json: object = JSON.parse(rawText)
    if (! ("types" in json)) {
        return registeredTypes;
    } 
    const types = json.types
    if (types === null || typeof types !== "object") {
        return registeredTypes;
    }
    for (const [propertyName, maybePropertyType] of Object.entries(types)) {
        if (isValidPropertyType(maybePropertyType)) {
            registeredTypes[propertyName] = maybePropertyType
        }
    }
    return registeredTypes;
}

export function filterByType<T extends readonly PropertyType[]>(types: RegisteredTypes, includedTypes: T): { [propertyName: string]: T[number] } {
    let allMatch = true
    const entries = Object.entries(types)
    for (const [name, type] of entries) {
        if (! includedTypes.includes(type)) {
            allMatch = false;
            break;
        }
    }
    if (allMatch) {
        return types;
    }
    const subset: { [propertyName: string]: T[number] } = {};
    for (const [name, type] of entries) {
        if (includedTypes.includes(type)) {
            subset[name] = type;
        }
    }
    return subset
}