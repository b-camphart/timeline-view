<script lang="ts">
	import type { QueryFilterReaderWriter } from "src/timeline/filter/query";
	import { noop } from "src/utils/noop";

	interface Props {
		queriable: QueryFilterReaderWriter;
		onchanged?: (query: string) => void;
	}

	let { queriable, onchanged = noop }: Props = $props();

	const query = {
		get value() {
			return queriable.query();
		},
		set value(query: string) {
			queriable.filterByQuery(query);
			onchanged(query);
		},
	};
</script>

<input type="text" spellcheck="false" placeholder="Enter query..." bind:value={query.value} />
