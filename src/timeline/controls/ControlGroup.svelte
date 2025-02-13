<script lang="ts">
	import type { Snippet } from "svelte";

	const { children }: { children?: Snippet } = $props();
</script>

<li class="timeline-view--control-group">
	{@render children?.()}
</li>

<style>
	li.timeline-view--control-group {
		list-style-type: none;
	}
	.timeline-view--control-group {
		padding: 0;
		margin: 0;
	}

	.timeline-view--control-group :global(button.control-item.clickable-icon) {
		background-color: var(--interactive-normal);
	}
	.timeline-view--control-group
		:global(button.control-item.clickable-icon:hover) {
		background-color: var(--interactive-normal);
	}

	.timeline-view--control-group {
		border-radius: var(--radius-s);
		background-color: var(--timeline-settings-background);
		border: 1px solid var(--background-modifier-border);
		box-shadow: var(--input-shadow);
		box-sizing: border-box;
	}
</style>
