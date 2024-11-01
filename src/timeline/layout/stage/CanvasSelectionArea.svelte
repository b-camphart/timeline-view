<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import type { OffsetBox } from "./TimelineItemElement";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		area: OffsetBox | undefined | null;
	}

	let { area, class: className = "", ...divProps }: Props = $props();
</script>

{#if area != null}
	<div
		class="timeline-selection-area {className}"
		style:position="absolute"
		style:left={area.offsetLeft + "px"}
		style:top={area.offsetTop + "px"}
		style:width={area.offsetWidth + "px"}
		style:height={area.offsetHeight + "px"}
		{...divProps}
	></div>
{/if}

<style>
	@property --timeline-selection-area-background {
		syntax: "<color>";
		initial-value: rgba(128, 0, 128, 0.199);
		inherits: true;
	}

	@property --timeline-selection-area-border {
		syntax: "<color>";
		initial-value: rgba(128, 0, 128, 0.5);
		inherits: true;
	}

	div {
		background-color: var(--timeline-selection-area-background);
		border: 2px solid var(--timeline-selection-area-border);
	}
</style>
