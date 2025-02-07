<script lang="ts">
	import type { AriaRole } from "svelte/elements";
	import type { OffsetBox } from "./TimelineItemElement";

	interface Props {
		area: OffsetBox | undefined | null;
		class?: string;
		role?: AriaRole | undefined;
	}

	let { area, class: className = "", role = undefined }: Props = $props();
</script>

{#if area != null}
	<div
		class="timeline-selection-area {className}"
		style:position="absolute"
		style:left={area.offsetLeft + "px"}
		style:top={area.offsetTop + "px"}
		style:width={area.offsetWidth + "px"}
		style:height={area.offsetHeight + "px"}
		{role}
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
		pointer-events: none;
	}
</style>
