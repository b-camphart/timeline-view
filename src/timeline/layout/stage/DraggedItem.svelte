<script lang="ts">
	import {
		ValueFormatter,
		constrainedWithinBody,
	} from "src/timeline/layout/stage/Hover.svelte";
	import { hoverTooltip } from "src/view/Tooltip";

	interface Props {
		formatter: ValueFormatter;
		position: {
			offsetTop: number;
			offsetLeft: number;
			offsetWidth: number;
		};
		name: string;
		value: number;
		length?: number;
		endValue?: number;
	}

	let {
		formatter,
		position,
		name,
		value,
		length: providedLength,
		endValue: providedEndValue,
	}: Props = $props();
	const length = $derived(providedLength ?? 0);
	const endValue = $derived(providedEndValue ?? value + length);

	const label = $derived.by(() => {
		if (providedLength === undefined) {
			return `${name}\n${formatter.formatValue(value)}`;
		}

		return `${name}\nlength: ${formatter.formatLength(length)}\nstart: ${formatter.formatValue(value)} - end: ${formatter.formatValue(endValue)}`;
	});
</script>

<div
	use:hoverTooltip={{
		visible: true,
		label,
		className: "timeline-item-tooltip",
		elementPosition: constrainedWithinBody.bind(null, hoverTooltip.center),
	}}
	aria-label={label}
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
