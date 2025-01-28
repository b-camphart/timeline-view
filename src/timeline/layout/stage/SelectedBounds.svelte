<script lang="ts">
	import CanvasSelectionArea from "./CanvasSelectionArea.svelte";
	import type { OffsetBox } from "./TimelineItemElement";

	interface Props {
		bounds: OffsetBox | undefined | null;
		selectedItemCount: number;
		dragging: boolean;
		onmousedown?: (event: MouseEvent) => void;
		onmouseup?: (event: MouseEvent) => void;
		onwheel?: (event: WheelEvent) => void;
	}

	let {
		bounds,
		selectedItemCount,
		dragging,
		onmousedown,
		onmouseup,
		onwheel,
	}: Props = $props();
</script>

{#if bounds != null && selectedItemCount > 1}
	<CanvasSelectionArea
		class="selected {dragging && 'dragging'}"
		area={bounds}
		{onmousedown}
		{onmouseup}
		{onwheel}
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
