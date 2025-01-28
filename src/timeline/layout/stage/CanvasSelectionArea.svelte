<script lang="ts">
	import type { AriaRole } from "svelte/elements";
	import type { OffsetBox } from "./TimelineItemElement";

	interface Props {
		area: OffsetBox | undefined | null;
		class?: string;
		role?: AriaRole | undefined;
		tabindex?: number;
		onwheel?: (event: WheelEvent) => void;
		onmousedown?: (event: MouseEvent) => void;
		onmouseup?: (event: MouseEvent) => void;
	}

	let {
		area,
		class: className = "",
		role = undefined,
		tabindex = 0,
		onmousedown,
		onmouseup,
		onwheel,
	}: Props = $props();
</script>

{#if area != null}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		class="timeline-selection-area {className}"
		style:position="absolute"
		style:left={area.offsetLeft + "px"}
		style:top={area.offsetTop + "px"}
		style:width={area.offsetWidth + "px"}
		style:height={area.offsetHeight + "px"}
		{role}
		{onwheel}
		{onmousedown}
		{onmouseup}
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
