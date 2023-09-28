const validPropertyTypes = ["number", "date", "datetime"] as const;
export type TimelinePropertyType = typeof validPropertyTypes[number];
export type TimelineProperties = { [propertyName: string]: TimelinePropertyType };

export function isTimelinePropertyType(type: string): type is TimelinePropertyType {
    return validPropertyTypes.includes(type as any);
}