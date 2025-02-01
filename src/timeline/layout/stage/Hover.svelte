<script module lang="ts">
	export function constrainedWithinBody(
		position: (rect: DOMRect) => { x: number; y: number },
		bounds: DOMRect,
	) {
		const bodyBounds = document.body.getBoundingClientRect();

		let left = Math.max(0, Math.min(bodyBounds.width, bounds.x));
		let top = Math.max(0, Math.min(bodyBounds.height, bounds.y));
		let right = Math.max(0, Math.min(bodyBounds.width, bounds.right));
		let bottom = Math.max(0, Math.min(bodyBounds.height, bounds.bottom));

		return position(new DOMRect(left, top, right - left, bottom - top));
	}

	export class ValueFormatter {
		#formatValue;
		formatValue(value: number) {
			return this.#formatValue(value);
		}

		#formatLength;
		formatLength(length: number) {
			return this.#formatLength(length);
		}

		constructor(
			formatValue: (value: number) => string,
			formatLength: (value: number) => string,
		) {
			this.#formatValue = formatValue;
			this.#formatLength = formatLength;
		}
	}
</script>

<script lang="ts">
	import { hoverTooltip } from "src/view/Tooltip";
	import { fade } from "svelte/transition";

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

	let hovered = $state(false);
</script>

<div
	use:hoverTooltip={{
		visible: hovered,
		label,
		className: "timeline-item-tooltip",
		elementPosition: constrainedWithinBody.bind(null, hoverTooltip.center),
	}}
	transition:fade={{ duration: 500 }}
	onintroend={() => (hovered = true)}
	onoutrostart={() => (hovered = false)}
	class="timeline-item hover"
	aria-label={label}
	style:top="{position.offsetTop}px"
	style:left="{position.offsetLeft}px"
	style:width="{position.offsetWidth}px"
></div>

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
		height: var(--timeline-item-diameter);
		border-radius: var(--timeline-item-diameter);

		position: absolute;
		margin: 0;
		pointer-events: none;
	}
</style>
