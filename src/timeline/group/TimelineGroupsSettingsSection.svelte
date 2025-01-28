<script lang="ts">
	import { run } from "svelte/legacy";

	import LucideIcon from "src/obsidian/view/LucideIcon.svelte";
	import type { TimelineGroups } from "src/timeline/group/groups";
	import TimelineGroupsList from "src/timeline/group/TimelineGroupsList.svelte";
	import type { Collapsable } from "src/view/collapsable";
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import type { ComponentProps } from "svelte";

	type TimelineGroupsListProps = ComponentProps<typeof TimelineGroupsList>;

	interface Props {
		collapsable: Collapsable;
		pendingGroupUpdates: number;
		groups: TimelineGroups;
		onGroupAppended?: TimelineGroupsListProps["onGroupAppended"];
		onGroupsReordered?: TimelineGroupsListProps["onGroupsReordered"];
		onGroupRemoved?: TimelineGroupsListProps["onGroupRemoved"];
		onGroupColored?: TimelineGroupsListProps["onGroupColored"];
		onGroupQueried?: TimelineGroupsListProps["onGroupQueried"];
	}

	let {
		collapsable,
		pendingGroupUpdates,
		groups,
		onGroupAppended = undefined,
		onGroupsReordered = undefined,
		onGroupRemoved = undefined,
		onGroupColored = undefined,
		onGroupQueried = undefined,
	}: Props = $props();

	let collapsed = $state(collapsable.isCollapsed());
	function onCollapsableChanged(collapsable: Props["collapsable"]) {
		collapsed = collapsable.isCollapsed();
	}
	function onCollapsedChanged(collapsed: boolean) {
		if (collapsed) {
			collapsable.collapse();
		} else {
			collapsable.expand();
		}
		collapsed = collapsable.isCollapsed();
	}

	run(() => {
		onCollapsableChanged(collapsable);
	});
	run(() => {
		onCollapsedChanged(collapsed);
	});
</script>

<CollapsableSection
	name="Groups"
	bind:collapsed
	class="timeline-settings-groups-section"
>
	{#if pendingGroupUpdates > 0}
		<span
			class="group-update-progress"
			role="progressbar"
			aria-valuenow={pendingGroupUpdates}
		>
			<LucideIcon id="loader-2" />
			{pendingGroupUpdates.toLocaleString()} pending
		</span>
	{/if}
	<TimelineGroupsList
		{groups}
		{onGroupAppended}
		{onGroupsReordered}
		{onGroupRemoved}
		{onGroupColored}
		{onGroupQueried}
	/>
</CollapsableSection>

<style>
	.group-update-progress {
		position: absolute;
		top: var(--size-2-3);
		right: var(--size-4-3);
		padding: var(--nav-item-parent-padding);
		padding-right: 0;
		color: var(--icon-color);
		font-size: small;
		display: inline-flex;
		align-items: center;
		gap: var(--size-2-2);

		& > svg {
			animation: 0.5s linear infinite spin;
		}
	}
</style>
