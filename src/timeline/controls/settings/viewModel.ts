import type { TimelinePropertySettingViewModel } from "src/timeline/property/viewmodel";
import type { TimelineDisplaySettingViewModel } from "./display/viewModel";
import type { TimelineFilterSettingViewModel } from "src/timeline/filter/viewmodel";
import type { TimelineGroupsSettingViewModel } from "src/timeline/group/viewModel";

export type TimelineSettingsViewModel = {
	isOpen: boolean;
	property: TimelinePropertySettingViewModel;
	filter: TimelineFilterSettingViewModel;
	groups: TimelineGroupsSettingViewModel;
	display: TimelineDisplaySettingViewModel;
};
