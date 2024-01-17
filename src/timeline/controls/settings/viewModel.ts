import type { TimelineDisplaySettingViewModel } from "./display/viewModel"

export type TimelineSettingsViewModel = {
    isOpen: boolean,
    display: TimelineDisplaySettingViewModel
}

export function initialTimelineSettingsViewModel(): TimelineSettingsViewModel {
    return {
        isOpen: false,
        display: {
            collapsed: true,
            names: false
        }
    }
}