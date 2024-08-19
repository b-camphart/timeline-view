import { type TimelineViewModel } from "src/timeline/viewModel";
import type { ObsidianNoteTimelineSettingsViewModel } from "./settings/viewModel";

export type ObsidianNoteTimelineViewModel = TimelineViewModel & {
	settings: ObsidianNoteTimelineSettingsViewModel;
};
