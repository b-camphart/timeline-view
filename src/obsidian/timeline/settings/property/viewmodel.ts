export type TimelinePropertySettingViewModel = {
	collapsed: boolean;
	property: string;
	secondaryProperty: {
		name: string;
		inUse: boolean;
		useAs: "length" | "end";
	};
	propertiesUseWholeNumbers: Record<string, boolean>;
};
