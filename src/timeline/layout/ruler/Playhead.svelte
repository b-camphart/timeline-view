<script lang="ts">
	import { hoverTooltip } from "src/view/Tooltip";

	interface Props {
		x: number;
		label: string;
	}

	let { x, label }: Props = $props();

	const tooltip = {
		label,
		visible: true,
		className: "mod-top",
		elementPosition: hoverTooltip.top,
	};
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
