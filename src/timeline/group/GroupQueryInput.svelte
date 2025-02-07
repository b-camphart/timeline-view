<script lang="ts">
	interface Props {
		/** @bindable */
		query: string;
	}

	let { query = $bindable() }: Props = $props();
</script>

<input
	type="text"
	spellcheck="false"
	placeholder="Enter query..."
	bind:value={query}
/>
