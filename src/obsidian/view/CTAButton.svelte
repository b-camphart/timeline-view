<script lang="ts">
	import type { ComponentProps } from "svelte";
	import ActionButton from "src/view/inputs/ActionButton.svelte";
	interface Props {
		children?: import('svelte').Snippet;
		[key: string]: any
	}

	let { children, ...rest }: Props = $props();

	
</script>

<ActionButton class="mod-cta" on:action {...rest}>
	{@render children?.()}
</ActionButton>
<!-- 
<style>
	:global(button.mod-cta) {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}
</style> -->
