<script lang="ts">
	import type { ComponentProps } from "svelte";
	import ActionButton from "src/view/inputs/ActionButton.svelte";

	interface $$Props extends ComponentProps<ActionButton> {}
</script>

<ActionButton class="mod-cta" on:action {...$$restProps}>
	<slot></slot>
</ActionButton>
<!-- 
<style>
	:global(button.mod-cta) {
		background-color: var(--interactive-accent);
		color: var(--text-on-accent);
	}
</style> -->
