export type TimelinePropertySettingViewModel = {
	collapsed: boolean;
	property: string;
	interpretedAs: "date" | "number",
	secondaryProperty: {
		name: string;
		inUse: boolean;
		useAs: "length" | "end";
	};
	propertiesUseWholeNumbers: Record<string, boolean>;
};
