<script lang="ts">
	import type { TimelineItem, ValueDisplay } from "src/timeline/Timeline";

	export let hover: {
		element: {
			offsetTop: number;
			offsetLeft: number;
			offsetBottom: number;
			offsetCenterX: number;
			layoutItem: {
				item: TimelineItem;
			};
		};
	};
	export let display: ValueDisplay;
	export let stage: Element;

	$: label = `${hover.element.layoutItem.item.name()}: ${display.displayValue(hover.element.layoutItem.item.value())}`;

	function displayTooltip(_node: HTMLDivElement) {
		const tooltip = document.createElement("div");
		document.body.appendChild(tooltip);
		tooltip.className = "tooltip";

		tooltip.innerText = label;

		const tooltipArrow = document.createElement("div");
		tooltipArrow.className = "tooltip-arrow";
		tooltip.appendChild(tooltipArrow);

		tooltip.setCssStyles({
			translate: `0 ${tooltipArrow.offsetHeight}px`,
			top: `${hover.element.offsetBottom + stage.getBoundingClientRect().top}px`,
			left: `${hover.element.offsetCenterX + stage.getBoundingClientRect().left}px`,
		});
		return {
			destroy() {
				tooltip.remove();
			},
		};
	}
</script>

<div
	use:displayTooltip
	class="timeline-point hover"
	aria-label={label}
	style="top: {hover.element.offsetTop}px; left: {hover.element
		.offsetLeft}px;"
></div>

<style>
	.timeline-point.hover {
		position: absolute;
		margin: 0;
		pointer-events: none;
	}
</style>
