import type { TimelineSettingsViewModel } from "src/timeline/controls/settings/viewModel";
import type { TimelinePropertySettingViewModel } from "./property/viewmodel";
import type { TimelineFilterSettingViewModel } from "./filter/viewmodel";
import type { TimelineGroupsSettingViewModel } from "./groups/viewModel";

export type ObsidianNoteTimelineSettingsViewModel = TimelineSettingsViewModel & {
    property: TimelinePropertySettingViewModel,
    filter: TimelineFilterSettingViewModel,
    groups: TimelineGroupsSettingViewModel
}