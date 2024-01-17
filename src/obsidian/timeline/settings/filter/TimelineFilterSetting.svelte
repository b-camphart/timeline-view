<script lang="ts">
	import CollapsableSection from "src/view/CollapsableSection.svelte";
    import type { NamespacedWritableFactory } from 'src/timeline/Persistence'
    import type { TimelineFilterSettingViewModel } from './viewmodel'

	export let viewModel: NamespacedWritableFactory<TimelineFilterSettingViewModel>;

    const collapsed = viewModel.make('collapsed', true)
    const query = viewModel.make('query', "")
</script>

<CollapsableSection name="Filter" bind:collapsed={$collapsed}>
	<input
		type="search"
		placeholder="Search files..."
		bind:value={$query}
	/>
</CollapsableSection>
