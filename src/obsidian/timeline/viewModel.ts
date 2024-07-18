import {
	initialTimelineViewModel,
	type TimelineViewModel,
} from "src/timeline/viewModel";
import type { ObsidianNoteTimelineSettingsViewModel } from "./settings/viewModel";

export function initialTimelineItemViewModel(
	from?: unknown,
): ObsidianNoteTimelineViewModel {
	const initialVM = initialTimelineViewModel();
	return {
		...initialVM,
		settings: {
			...initialVM.settings,
			property: {
				collapsed: true,
				property: "created",
				propertiesUseWholeNumbers: {},
			},
			filter: {
				collapsed: true,
				query: "",
			},
			groups: {
				collapsed: true,
				groups: [],
			},
		},
	};
}
export type ObsidianNoteTimelineViewModel = TimelineViewModel & {
	settings: ObsidianNoteTimelineSettingsViewModel;
};
