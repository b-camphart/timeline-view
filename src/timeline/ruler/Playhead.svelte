<script lang="ts">
	import { hoverTooltip } from "src/view/Tooltip";
	import { bodyTooltip } from "src/view/Tooltip.svelte";

	interface Props {
		x: number;
		label: string;
	}

	let { x, label }: Props = $props();
</script>

<div
	style="left: {x}px;"
	use:bodyTooltip={{
		get label() {
			return label;
		},
		mod: "mod-top",
		side: hoverTooltip.top,
	}}
></div>

<style>
	div {
		opacity: 0;
		position: absolute;
		pointer-events: none;
		top: 0;
		height: 100%;
		width: 2px;
	}
</style>
