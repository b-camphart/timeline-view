<script lang="ts">
	import type { QueryFilterReaderWriter } from "src/timeline/filter/query";
	import TimelineQueryFilterInput from "src/timeline/filter/TimelineQueryFilterInput.svelte";
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import type { Writable } from "svelte/store";

	interface Props {
		filter: QueryFilterReaderWriter;
		filtering: boolean;
		collapsed: Writable<boolean>;
	}

	let { filter, filtering, collapsed }: Props = $props();
</script>

<CollapsableSection name="Filter" bind:collapsed={$collapsed}>
	<TimelineQueryFilterInput {filter} {filtering} />
</CollapsableSection>

<style>
</style>
