export const ALL_PROPERTY_TYPES = [
    "aliases",
    "multitext",
    "tags",
    "datetime",
    "date",
    "number",
    "checkbox",
    "text",
] as const;

export type PropertyType = (typeof ALL_PROPERTY_TYPES)[number];

export function isTypeOfProperty(type: string): type is PropertyType {
    return (ALL_PROPERTY_TYPES as readonly string[]).includes(type);
}
