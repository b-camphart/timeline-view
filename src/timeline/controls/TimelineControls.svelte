<script lang="ts">
	import TimelineSettings from "./settings/TimelineSettings.svelte";
	import type { TimelineSettingsViewModel } from './settings/viewModel'
	import TimelineNavigationControls from "./TimelineNavigationControls.svelte";
	import type { NamespacedWritableFactory } from "../Persistence";
	import type { TimelineNavigation } from "./TimelineNavigation";

	export let namespacedWritable: NamespacedWritableFactory<TimelineSettingsViewModel> | undefined = undefined;
	export let navigation: TimelineNavigation;
</script>

<menu class="timeline-controls">
	<TimelineNavigationControls
		class="control-group"
		{navigation}
	/>
	<TimelineSettings
		class="control-group"
		namespacedWritable={namespacedWritable}
	>
		<svelte:fragment slot="additional-settings">
			<slot name="additional-settings"></slot>
		</svelte:fragment>
	</TimelineSettings>
</menu>

<style>
	menu.timeline-controls {
		padding: 0;
		top: 8px;
		right: 8px;
		margin: 0;
		pointer-events: none;
	}
	menu.timeline-controls > :global(*) {
		pointer-events: auto;
	}
	.timeline-controls :global(menu) {
		padding: 0;
		margin: 0;
	}
	.timeline-controls {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: end;
	}
</style>
