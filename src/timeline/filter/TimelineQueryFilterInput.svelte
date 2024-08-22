<script lang="ts">
	import ObsidianSearchInput from "src/obsidian/view/ObsidianSearchInput.svelte";
	import type { QueryFilterReaderWriter } from "src/timeline/filter/query";

	export let filter: QueryFilterReaderWriter;

	let query: string = filter.query();
	$: if (query != filter.query()) {
		filter.filterByQuery(query);
		query = filter.query();
	}
</script>

<ObsidianSearchInput placeholder="Search files..." bind:value={query} />
