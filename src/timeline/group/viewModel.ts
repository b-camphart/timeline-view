export type TimelineGroupsSettingViewModel = {
    collapsed: boolean,
    groups: TimelineGroupViewModel[]
}

export type TimelineGroupViewModel = {
    query: string,
    color: string
}