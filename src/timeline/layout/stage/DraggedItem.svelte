<script lang="ts">
	import type { ValueDisplay } from "src/timeline/Timeline";
	import { hoverTooltip } from "src/view/Tooltip";

	interface Props {
		display: ValueDisplay;
		position: {
		offsetTop: number;
		offsetLeft: number;
	};
		name: string;
		value: number;
	}

	let {
		display,
		position,
		name,
		value
	}: Props = $props();

	let label = $derived(`${name}: ${display.displayValue(value)}`);
</script>

<div
	use:hoverTooltip={{
		visible: true,
		label,
		className: "timeline-item-tooltip",
	}}
	aria-label={label}
	style:top="{position.offsetTop}px"
	style:left="{position.offsetLeft}px"
></div>

<style>
	div {
		width: var(--timeline-item-diameter);
		height: var(--timeline-item-diameter);
		border-radius: 100%;

		position: absolute;
		margin: 0;
		pointer-events: none;
	}
</style>
