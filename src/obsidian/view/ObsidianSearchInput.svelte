<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	

	interface Props {
		value: string;
		[key: string]: any
	}

	let { value = $bindable(), ...rest }: Props = $props();
</script>

<div class="search-input-container">
	<input
		type="search"
		enterkeyhint="search"
		spellcheck="false"
		bind:value
		{...rest}
	/>
</div>
