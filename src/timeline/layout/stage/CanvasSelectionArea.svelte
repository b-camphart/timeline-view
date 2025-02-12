<script lang="ts">
	import type { AriaRole } from "svelte/elements";
	import type { OffsetBox } from "./TimelineItemElement";

	interface Props {
		area: OffsetBox | undefined | null;
		role?: AriaRole | undefined;
		selected?: true;
	}

	let { area, role = undefined, selected }: Props = $props();
</script>

{#if area != null}
	<div
		class="timeline-selection-area"
		aria-selected={selected}
		style:--left="{area.offsetLeft}px"
		style:--top={area.offsetTop + "px"}
		style:--width={area.offsetWidth + "px"}
		style:--height={area.offsetHeight + "px"}
		{role}
	></div>
{/if}

<style>
	div {
		background-color: var(--selection-area-background-color);
		border: var(--selection-area-border-width) solid
			var(--selection-area-border-color);
		border-radius: var(--selection-area-border-radius);
	}
	div[aria-selected] {
		background-color: var(--selected-area-background-color);
		border: var(--selected-area-border-width) solid
			var(--selected-area-border-color);
		border-radius: var(--selected-area-border-radius);
	}
	div {
		pointer-events: none;

		position: absolute !important;
		--glow: var(--selection-area-glow);

		left: calc(var(--left) - var(--glow));
		top: calc(var(--top) - var(--glow));
		width: calc(var(--width) + var(--glow) * 2);
		height: calc(var(--height) + var(--glow) * 2);
	}
</style>
