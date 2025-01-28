<script lang="ts">
	import type { AriaRole } from "svelte/elements";
	import type { OffsetBox } from "./TimelineItemElement";

	export let area: OffsetBox | undefined | null;
	let className: string = "";
	export { className as class };

	export let role: AriaRole | undefined = undefined;
	export let tabindex: number = 0;
</script>

{#if area != null}
	<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
	<div
		class="timeline-selection-area {className}"
		style:position="absolute"
		style:left={area.offsetLeft + "px"}
		style:top={area.offsetTop + "px"}
		style:width={area.offsetWidth + "px"}
		style:height={area.offsetHeight + "px"}
		{role}
		on:wheel
		on:mousedown
		on:mouseup
		{tabindex}
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
