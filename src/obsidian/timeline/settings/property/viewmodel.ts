export type TimelinePropertySettingViewModel = {
	collapsed: boolean;
	property: string;
	secondaryProperty: string;
	secondaryPropertyInUse: boolean;
	useSecondaryPropertyAs: "length" | "end";
	propertiesUseWholeNumbers: Record<string, boolean>;
};
