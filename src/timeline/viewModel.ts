import {
	initialTimelineSettingsViewModel,
	type TimelineSettingsViewModel,
} from "./controls/settings/viewModel";

export type TimelineViewModel = {
	scale: number;
	focalValue: number;
	vScroll: number;
	settings: TimelineSettingsViewModel;
	mode: "edit" | "view";
};

export function initialTimelineViewModel(): TimelineViewModel {
	return {
		scale: 1,
		focalValue: 0,
		vScroll: 0,
		mode: "edit",
		settings: initialTimelineSettingsViewModel(),
	};
}
