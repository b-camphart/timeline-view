<script lang="ts">
	import type { ValueDisplay } from "src/timeline/Timeline";
	import { hoverTooltip } from "src/view/Tooltip";
	import { fade } from "svelte/transition";

	export let display: ValueDisplay;
	export let position: {
		offsetTop: number;
		offsetLeft: number;
	};
	export let name: string;
	export let value: number;

	$: label = `${name}: ${display.displayValue(value)}`;

	let hovered = false;
</script>

<div
	use:hoverTooltip={{
		visible: hovered,
		label,
		className: "timeline-item-tooltip",
	}}
	transition:fade={{ duration: 500 }}
	on:introend={() => (hovered = true)}
	on:outrostart={() => (hovered = false)}
	class="timeline-item hover"
	aria-label={label}
	style:top="{position.offsetTop}px"
	style:left="{position.offsetLeft}px"
/>

<style>
	:global(.timeline-item.hover) {
		background-color: var(--timeline-item-color-hover);

		border: 2px solid var(--timeline-item-border-hover);
		box-sizing: content-box;
		translate: -2px -2px;
	}
	:global(.timeline-item-tooltip) {
		--timeline-item-radius: 8px;
		--arrow-size: 5px;
		background-color: var(--timeline-item-tooltip-background);
		transform: translate(
			-50%,
			calc(-100% - var(--timeline-item-radius) - var(--arrow-size) - 2px)
		);
		animation: pop-up 200ms forwards ease-in-out;
	}
	:global(.timeline-item-tooltip .tooltip-arrow) {
		top: unset;
		bottom: calc(-1 * var(--arrow-size));
		border-top: var(--arrow-size) solid
			var(--timeline-item-tooltip-background);
		border-left: var(--arrow-size) solid transparent;
		border-right: var(--arrow-size) solid transparent;
		border-bottom: none;
	}

	div {
		width: var(--timeline-item-diameter);
		height: var(--timeline-item-diameter);
		border-radius: 100%;

		position: absolute;
		margin: 0;
		pointer-events: none;
	}
</style>
