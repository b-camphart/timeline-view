<script lang="ts">
	import LucideIcon from "src/obsidian/view/LucideIcon.svelte";
	import type { TimelineGroups } from "src/timeline/group/groups";
	import TimelineGroupsList from "src/timeline/group/TimelineGroupsList.svelte";
	import type { Collapsable } from "src/view/collapsable";
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import type { ComponentProps } from "svelte";

	interface Props extends ComponentProps<typeof TimelineGroupsList> {
		collapsable: Collapsable;
		pendingGroupUpdates: number;
		groups: TimelineGroups;
	}

	let { collapsable, pendingGroupUpdates, groups, ...timelineGroupsListProps }: Props = $props();

	const collapsed = {
		get value() {
			return collapsable.isCollapsed();
		},
		set value(value) {
			if (value) {
				collapsable.collapse();
			} else {
				collapsable.expand();
			}
		},
	};
</script>

<CollapsableSection name="Groups" bind:collapsed={collapsed.value} class="timeline-settings-groups-section">
	{#if pendingGroupUpdates > 0}
		<span class="group-update-progress" role="progressbar" aria-valuenow={pendingGroupUpdates}>
			<LucideIcon id="loader-2" />
			{pendingGroupUpdates.toLocaleString()} pending
		</span>
	{/if}
	<TimelineGroupsList {groups} {...timelineGroupsListProps} />
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

		& > :global(svg) {
			animation: 0.5s linear infinite spin;
		}
	}
</style>
