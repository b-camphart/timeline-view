<script lang="ts">
	import type { Snippet } from "svelte";

	const { children }: { children?: Snippet } = $props();
</script>

<menu class="timeline-view--controls">
	{@render children?.()}
</menu>

<style>
	menu {
		pointer-events: none;
	}
	menu > :global(*) {
		pointer-events: all;
	}
	/*! Positioning */
	.timeline-view--controls {
		position: absolute;
		top: var(--ruler-height);
		margin-top: var(--size-4-2);
		margin-right: var(--size-4-2);
		right: calc(100% - var(--plotarea-client-width));
	}
	/*! Icon sizing */
	.timeline-view--controls {
		--icon-size: var(--icon-s);
		--icon-stroke: var(--icon-s-stroke-width);
	}
	/*! Menu padding overrides  */
	menu.timeline-view--controls {
		padding: 0;
	}

	/*! Internal layout */
	.timeline-view--controls {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-2);
		align-items: flex-end;
	}
</style>
