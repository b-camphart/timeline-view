<script lang="ts">
	import { run } from "svelte/legacy";

	import LucideIcon from "src/obsidian/view/LucideIcon.svelte";
	import TimelineGroupsList, {
		type Groups as TimelineGroups,
	} from "src/timeline/group/TimelineGroupsList.svelte";
	import type { Collapsable } from "src/view/collapsable";
	import CollapsableSection from "src/view/CollapsableSection.svelte";

	interface Props {
		/** @bindable */
		collapsed: boolean;
		pendingGroupUpdates: number;
		groups: TimelineGroups;
	}

	let {
		collapsed = $bindable(),
		pendingGroupUpdates,
		groups,
	}: Props = $props();
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
	<TimelineGroupsList {groups} />
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
