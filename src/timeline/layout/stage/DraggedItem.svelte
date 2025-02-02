<script lang="ts">
	import { constrainedWithinBody } from "src/timeline/layout/stage/Hover.svelte";
	import { hoverTooltip } from "src/view/Tooltip";

	interface Props {
		position: {
			offsetTop: number;
			offsetLeft: number;
			offsetWidth: number;
		};
		summary: string;
	}

	let { position, summary }: Props = $props();
</script>

<div
	use:hoverTooltip={{
		visible: true,
		label: summary,
		className: "timeline-item-tooltip",
		elementPosition: constrainedWithinBody.bind(null, hoverTooltip.center),
	}}
	aria-label={summary}
	style:top="{position.offsetTop}px"
	style:left="{position.offsetLeft}px"
	style:width="{position.offsetWidth}px"
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
