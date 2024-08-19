import type { TimelinePropertySettingViewModel } from "src/obsidian/timeline/settings/property/viewmodel";
import type { TimelineDisplaySettingViewModel } from "./display/viewModel";
import type { TimelineFilterSettingViewModel } from "src/obsidian/timeline/settings/filter/viewmodel";
import type { TimelineGroupsSettingViewModel } from "src/obsidian/timeline/settings/groups/viewModel";

export type TimelineSettingsViewModel = {
	isOpen: boolean;
	property: TimelinePropertySettingViewModel;
	filter: TimelineFilterSettingViewModel;
	groups: TimelineGroupsSettingViewModel;
	display: TimelineDisplaySettingViewModel;
};
