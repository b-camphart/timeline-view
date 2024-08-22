import { type TimelineSettingsViewModel } from "./controls/settings/viewModel";

export type TimelineViewModel = {
	scale: number;
	focalValue: number;
	vScroll: number;
	settings: TimelineSettingsViewModel;
	mode: "edit" | "view";
};
