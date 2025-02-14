<script lang="ts">
	import CanvasSelectionArea from "./CanvasSelectionArea.svelte";
	import type { OffsetBox } from "./TimelineItemElement";

	interface Props {
		bounds: OffsetBox | null;
		selectedItemCount: number;
		dragging: boolean;
	}

	let { bounds, selectedItemCount, dragging }: Props = $props();
</script>

{#if bounds != null && selectedItemCount > 1}
	<CanvasSelectionArea
		area={bounds}
		role="region"
		label="{selectedItemCount} items selected"
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
