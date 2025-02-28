<script lang="ts">
	import type { OffsetBox } from "./TimelineItemElement";

	const { focused }: { focused: OffsetBox | null } = $props();
</script>

{#if focused !== null}
	<div
		class="timeline-item focus"
		style:--top="{focused.offsetTop}px"
		style:--left="{focused.offsetLeft}px"
		style:--width="{focused.offsetWidth}px"
	></div>
{/if}

<style>
	:global(.timeline-item.focus) {
		border: 2px solid var(--timeline-item-border-focused);
		border-radius: 4px;
		box-sizing: content-box;
		top: calc(var(--top) - 2px);
		left: calc(var(--left) - 2px);
		width: var(--width);

		background-color: var(--timeline-item-color-focused);
	}

	div {
		height: var(--timeline-item-diameter);

		position: absolute;
		margin: 0;
		pointer-events: none;
	}
</style>
