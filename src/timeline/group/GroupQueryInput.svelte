<script lang="ts">
	import type { QueryFilterReaderWriter } from "src/timeline/filter/query";

	export let queriable: QueryFilterReaderWriter;
	export let onchanged: undefined | ((query: string) => void) = undefined;

	let query = queriable.query();
	function onNewQueriable(queriable: QueryFilterReaderWriter) {
		query = queriable.query();
	}
	$: onNewQueriable(queriable);

	function onQueryInput(query: string) {
		if (query !== queriable.query()) {
			queriable.filterByQuery(query);
			query = queriable.query();
			if (onchanged != null) {
				onchanged(query);
			}
		}
	}
	$: onQueryInput(query);
</script>

<input
	type="text"
	spellcheck="false"
	placeholder="Enter query..."
	bind:value={query}
/>
