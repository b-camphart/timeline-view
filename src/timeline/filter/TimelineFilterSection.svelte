<script lang="ts">
	import type { QueryFilterReaderWriter } from "src/timeline/filter/query";
	import TimelineQueryFilterInput from "src/timeline/filter/TimelineQueryFilterInput.svelte";
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import type { Writable } from "svelte/store";

	export let filter: QueryFilterReaderWriter;
	export let collapsed: Writable<boolean>;
</script>

<CollapsableSection name="Filter" bind:collapsed={$collapsed}>
	<TimelineQueryFilterInput {filter} />
</CollapsableSection>

<style>
</style>
