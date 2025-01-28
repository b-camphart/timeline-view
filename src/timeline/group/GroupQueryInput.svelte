<script lang="ts">
	import { run } from 'svelte/legacy';

	import type { QueryFilterReaderWriter } from "src/timeline/filter/query";

	interface Props {
		queriable: QueryFilterReaderWriter;
		onchanged?: undefined | ((query: string) => void);
	}

	let { queriable, onchanged = undefined }: Props = $props();

	let query = $state(queriable.query());
	function onNewQueriable(queriable: QueryFilterReaderWriter) {
		query = queriable.query();
	}
	run(() => {
		onNewQueriable(queriable);
	});

	function onQueryInput(query: string) {
		if (query !== queriable.query()) {
			queriable.filterByQuery(query);
			query = queriable.query();
			if (onchanged != null) {
				onchanged(query);
			}
		}
	}
	run(() => {
		onQueryInput(query);
	});
</script>

<input
	type="text"
	spellcheck="false"
	placeholder="Enter query..."
	bind:value={query}
/>
