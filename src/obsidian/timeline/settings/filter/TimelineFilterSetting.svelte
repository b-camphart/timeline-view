<script lang="ts">
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import type { NamespacedWritableFactory } from "src/timeline/Persistence";
	import type { TimelineFilterSettingViewModel } from "./viewmodel";

	export let viewModel: NamespacedWritableFactory<TimelineFilterSettingViewModel>;

	const collapsed = viewModel.make("collapsed", true);
	const query = viewModel.make("query", "");
</script>

<CollapsableSection name="Filter" bind:collapsed={$collapsed}>
	<div class="search-input-container">
		<input
			type="search"
			enterkeyhint="search"
			spellcheck="false"
			placeholder="Search files..."
			bind:value={$query}
		/>
	</div>
</CollapsableSection>

<style>
</style>
