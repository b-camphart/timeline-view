<script lang="ts">
	import { self, stopPropagation } from "svelte/legacy";

	import type { DOMAttributes, HTMLAttributes } from "svelte/elements";
	import { createEventDispatcher } from "svelte";
	import type { ChangeEventDetail } from "./Scrollbar";

	const dispatch = createEventDispatcher<{
		change: ChangeEventDetail;
		dragstart: void;
		dragend: void;
	}>();

	interface Props {
		orientation?: "horizontal" | "vertical";
		/**
		 * The id of the element that the scrollbar controls
		 */
		controls: string;
		tabindex: number;
		/**
		 * The current value between min and max
		 */
		value: number;
		/**
		 * The span of the total scrollable value (the span between min and max) that is visible
		 */
		visibleAmount: number;
		/**
		 * The minimum value that can be seen (not necessarily scrolled to)
		 */
		min?: number;
		/**
		 * The maximum value that can be seen (not necessarily scrolled to)
		 */
		max?: number;
		[key: string]: any;
	}

	let {
		orientation = "vertical",
		controls,
		tabindex,
		value,
		visibleAmount,
		min = 0,
		max = 100,
		...rest
	}: Props = $props();

	let span = $derived(max - min);

	let percent = $derived(span === 0 ? 1 : visibleAmount / span);
	let scrollSpan = $derived(Math.max(0, span - visibleAmount));

	let percentValue = $derived(
		scrollSpan === 0 ? 0 : (value - min) / scrollSpan,
	);

	let thumb: HTMLDivElement | undefined = $state();
	let dragging = $state(false);
	function onThumbMouseDown(e: MouseEvent) {
		const startScreenX = e.screenX;
		const startScreenY = e.screenY;
		const startValue = value;
		const startPercent = percent;
		const startMin = min;
		const startMax = max;

		let lastScreenX = e.screenX;
		let lastScreenY = e.screenY;

		function mouseMoveListener(e: MouseEvent) {
			if (!dragging) {
				dragging = true;
				dispatch("dragstart");
			}

			const deltaScreenX = e.screenX - lastScreenX;
			const deltaScreenY = e.screenY - lastScreenY;
			lastScreenX = e.screenX;
			lastScreenY = e.screenY;
			const deltaXSinceStart = e.screenX - startScreenX;
			const deltaYSinceStart = e.screenY - startScreenY;

			let deltaPixels = 0;
			let deltaPixelsSinceStart = 0;

			if (orientation === "horizontal") {
				deltaPixels = deltaScreenX;
				deltaPixelsSinceStart = deltaXSinceStart;
			} else {
				deltaPixels = deltaScreenY;
				deltaPixelsSinceStart = deltaYSinceStart;
			}

			const deltaValue = deltaPixels / startPercent;
			const deltaValueSinceStart = deltaPixelsSinceStart / startPercent;

			const newValue = Math.max(
				startMin,
				Math.min(startMax, startValue + deltaValueSinceStart),
			);

			dispatch("change", {
				dragging: true,
				deltaPixels,
				deltaPixelsSinceStart,
				deltaValue,
				deltaValueSinceStart,
				value: newValue,
				ratio: startPercent,
				startValue,
			});
		}

		function mouseUpListener(e: MouseEvent) {
			if (dragging) {
				dragging = false;
				dispatch("dragend");
			}
			window.removeEventListener("mousemove", mouseMoveListener);
			window.removeEventListener("mouseup", mouseUpListener);
		}

		window.addEventListener("mousemove", mouseMoveListener);
		window.addEventListener("mouseup", mouseUpListener);
	}

	function onBarMouseDown(e: MouseEvent) {
		if (thumb === undefined) return;
		// increment the value by the visible amount, and do so while the mouse is down
		// stop when the mouse is released, or the thumb is now under the mouse

		const startX = e.offsetX;
		const startY = e.offsetY;

		// should only trigger when not already over the thumb
		const direction = (
			orientation === "horizontal"
				? e.offsetX < thumb.offsetLeft
				: e.offsetY < thumb.offsetTop
		)
			? -1
			: 1;

		function incrementValue() {
			if (thumb === undefined) return;
			if (orientation === "horizontal") {
				if (
					thumb.offsetLeft <= startX &&
					thumb.offsetLeft + thumb.offsetWidth >= startX
				) {
					return;
				}
			} else {
				if (
					thumb.offsetTop <= startY &&
					thumb.offsetTop + thumb.offsetHeight >= startY
				) {
					return;
				}
			}

			let deltaValue = direction * visibleAmount;
			const targetValue = value + deltaValue;
			const newValue = Math.max(min, Math.min(max, targetValue));
			if (newValue !== targetValue) {
				deltaValue = newValue - value;
			}

			const deltaPixels = deltaValue * percent;

			dispatch("change", {
				dragging: false,
				value: newValue,
				deltaValue,
				deltaPixels,
				ratio: percent,
			});
		}
		incrementValue();
		const interval = setInterval(incrementValue, 50);
		function mouseUpListener() {
			clearInterval(interval);
			window.removeEventListener("mouseup", mouseUpListener);
		}

		window.addEventListener("mouseup", mouseUpListener);
	}
</script>

<div
	{...rest}
	role="scrollbar"
	aria-hidden={percent >= 0.99999999999}
	aria-orientation={orientation}
	aria-controls={controls}
	aria-valuenow={value}
	aria-valuemin={min}
	aria-valuemax={max}
	{tabindex}
	onmousedown={(e) => {
		if (e.target !== e.currentTarget) return;
		onBarMouseDown(e);
	}}
>
	<div
		role="presentation"
		onmousedown={(e) => {
			e.stopPropagation();
			onThumbMouseDown(e);
		}}
		bind:this={thumb}
		class="thumb"
		class:dragging
		style="--percent: {percent}; --value: {percentValue};"
	></div>
</div>

<style>
	[role="scrollbar"] {
		background-color: var(--scrollbar-bg, transparent);
	}
	[role="scrollbar"][aria-hidden="true"] {
		visibility: hidden;
	}
	[role="scrollbar"] .thumb {
		position: absolute;

		background-color: var(
			--scrollbar-thumb-bg,
			var(--ui1, rbga(256, 256, 256, 0.2))
		);

		background-clip: padding-box;
		border-radius: 20px;
		border: 3px solid transparent;
		border-width: 3px 3px 3px 3px;
	}
	[role="scrollbar"] .thumb:hover,
	[role="scrollbar"] .thumb.dragging {
		background-color: var(
			--scrollbar-active-thumb-bg,
			var(--ui3, rbga(256, 256, 256, 0.4))
		);
	}

	[role="scrollbar"][aria-orientation="horizontal"] {
		height: var(--size);
	}
	[role="scrollbar"][aria-orientation="vertical"] {
		width: var(--size);
	}

	[role="scrollbar"] .thumb {
		--min-size: 45px;
		--size: max(var(--min-size), calc(100% * var(--percent)));

		--range: calc(100% - var(--size));
		--position: calc(var(--range) * var(--value));
	}

	[role="scrollbar"][aria-orientation="horizontal"] .thumb {
		height: 100%;

		min-width: var(--min-size);
		width: var(--size);
		left: var(--position);
	}
	[role="scrollbar"][aria-orientation="vertical"] .thumb {
		width: 100%;

		min-height: var(--min-size);
		height: var(--size);

		top: var(--position);
	}
	:global(
			*:has(
					[role="scrollbar"][aria-orientation="horizontal"][aria-hidden="false"]
				)
		)
		[role="scrollbar"][aria-orientation="vertical"][aria-hidden="false"] {
		height: calc(100% - var(--size));
	}
	:global(
			*:has(
					[role="scrollbar"][aria-orientation="vertical"][aria-hidden="false"]
				)
		)
		[role="scrollbar"][aria-orientation="horizontal"][aria-hidden="false"] {
		width: calc(100% - var(--size));
	}
</style>
