<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	interface $$Props extends HTMLAttributes<HTMLInputElement> {
		value: string;
	}

	export let value: string;
</script>

<div class="search-input-container">
	<input
		type="search"
		enterkeyhint="search"
		spellcheck="false"
		bind:value
		{...$$restProps}
	/>
</div>
