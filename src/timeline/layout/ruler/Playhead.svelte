<script lang="ts">
	import { hoverTooltip } from "src/view/Tooltip";

	export let x: number;
	export let label: string;

	let tooltip = {
		label,
		visible: true,
		className: "mod-top",
		elementPosition: hoverTooltip.top,
	};
	$: x,
		(tooltip = {
			label,
			visible: true,
			className: "mod-top",
			elementPosition: hoverTooltip.top,
		});
</script>

<div style="left: {x}px;" use:hoverTooltip={tooltip}></div>

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
