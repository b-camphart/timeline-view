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
	import { bodyTooltip } from "src/view/Tooltip.svelte";
	import { fade } from "svelte/transition";

	interface Props {
		position: {
			offsetTop: number;
			offsetLeft: number;
			offsetWidth: number;
		};
		summary: string;
	}

	let { position, summary }: Props = $props();

	let el = $state<HTMLElement | null>(null);

	let tooltip = $state<null | { destroy: () => void }>(null);
	function showTooltip() {
		hideTooltip();
		tooltip = bodyTooltip(el!, {
			mod: "mod-top",
			label: summary,
			side: constrainedWithinBody.bind(null, hoverTooltip.top),
		});
	}
	function hideTooltip() {
		tooltip?.destroy();
	}
</script>

<div
	bind:this={el}
	transition:fade={{ duration: 500 }}
	onintroend={showTooltip}
	onoutrostart={hideTooltip}
	class="timeline-view--item-hover"
	aria-label={summary}
	style:--top="{position.offsetTop}px"
	style:--left="{position.offsetLeft}px"
	style:--width="{position.offsetWidth}px"
></div>

<style>
	div {
		top: var(--top);
		left: var(--left);
		width: var(--width);
		height: var(--item-size);
	}
	.timeline-view--item-hover {
		background-color: var(--hover-item-color);
	}
	.timeline-view--item-hover {
		border: var(--hover-item-border-size) solid
			var(--hover-item-border-color);

		top: calc(var(--top) - var(--hover-item-border-size));
		left: calc(var(--left) - var(--hover-item-border-size));
		width: calc(var(--width) + var(--hover-item-border-size) * 2);
		height: calc(var(--item-size) + var(--hover-item-border-size) * 2);
	}

	.timeline-view--item-hover {
		border-radius: calc(var(--item-radius) + var(--hover-item-border-size));
	}

	div {
		position: absolute;
		margin: 0;
		pointer-events: none;
	}
</style>
