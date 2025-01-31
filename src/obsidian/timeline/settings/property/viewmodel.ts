export type TimelinePropertySettingViewModel = {
	collapsed: boolean;
	property: string;
	secondaryProperty: string;
	secondaryPropertyInUse: boolean;
	propertiesUseWholeNumbers: Record<string, boolean>;
};
