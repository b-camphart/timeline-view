<script lang="ts">
	import CanvasSelectionArea from "./CanvasSelectionArea.svelte";
	import type { OffsetBox } from "./TimelineItemElement";

	export let bounds: OffsetBox | undefined | null;
	export let selectedItemCount: number;
	export let dragging: boolean;
</script>

{#if bounds != null && selectedItemCount > 1}
	<CanvasSelectionArea
		class="selected {dragging && 'dragging'}"
		area={bounds}
		on:mousedown
		on:mouseup
		on:wheel
		role="gridcell"
		tabindex={0}
	/>
{/if}

<style>
	:global(.timeline-selection-area.selected) {
		opacity: 0.5;
	}

	:global(.editable .timeline-selection-area.selected) {
		cursor: grab;
	}

	:global(.editable .timeline-selection-area.selected.dragging) {
		opacity: 0;
	}
</style>
