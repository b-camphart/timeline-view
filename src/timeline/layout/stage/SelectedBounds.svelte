<script lang="ts">
	import type { ComponentProps } from "svelte";
	import CanvasSelectionArea from "./CanvasSelectionArea.svelte";
	import type { OffsetBox } from "./TimelineItemElement";

	interface Props extends Pick<ComponentProps<typeof CanvasSelectionArea>, "onmousedown" | "onmouseup" | "onwheel"> {
		bounds: OffsetBox | undefined | null;
		selectedItemCount: number;
		dragging: boolean;
	}

	let { bounds, selectedItemCount, dragging, ...selectionAreaProps }: Props = $props();
</script>

{#if bounds != null && selectedItemCount > 1}
	<CanvasSelectionArea
		class="selected {dragging && 'dragging'}"
		area={bounds}
		role="gridcell"
		tabindex={0}
		{...selectionAreaProps}
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
