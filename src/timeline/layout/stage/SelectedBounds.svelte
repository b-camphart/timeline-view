<script lang="ts">
	import CanvasSelectionArea from "./CanvasSelectionArea.svelte";
	import type { OffsetBox } from "./TimelineItemElement";

	interface Props {
		bounds: OffsetBox | undefined | null;
		selectedItemCount: number;
		dragging: boolean;
	}

	let { bounds, selectedItemCount, dragging }: Props = $props();
</script>

{#if bounds != null && selectedItemCount > 1}
	<CanvasSelectionArea
		class="selected {dragging && 'dragging'}"
		area={bounds}
		role="gridcell"
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
