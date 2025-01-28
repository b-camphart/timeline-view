<script lang="ts">
	import { run } from 'svelte/legacy';

	import ObsidianSearchInput from "src/obsidian/view/ObsidianSearchInput.svelte";
	import type { QueryFilterReaderWriter } from "src/timeline/filter/query";

	interface Props {
		filter: QueryFilterReaderWriter;
	}

	let { filter }: Props = $props();

	let query: string = $state(filter.query());
	run(() => {
		if (query != filter.query()) {
			filter.filterByQuery(query);
			query = filter.query();
		}
	});
</script>

<ObsidianSearchInput placeholder="Search files..." bind:value={query} />
