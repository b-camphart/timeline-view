<script lang="ts">
	import type { DOMAttributes, HTMLAttributes } from "svelte/elements";
	import { createEventDispatcher } from "svelte";
	import type { ChangeEventDetail } from "./Scrollbar";

	interface $$Props
		extends Omit<
			HTMLAttributes<HTMLDivElement>,
			// on:* props are not forwarded, remove from interface
			keyof DOMAttributes<HTMLDivElement>
		> {
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
	}

	const dispatch = createEventDispatcher<{
		change: ChangeEventDetail;
		dragstart: void;
		dragend: void;
	}>();

	export let orientation: "horizontal" | "vertical" = "vertical";
	export let controls: string;
	export let tabindex: number;
	export let value: number;
	export let visibleAmount: number;
	export let min: number = 0;
	export let max: number = 100;

	$: span = max - min;

	$: percent = span === 0 ? 1 : visibleAmount / span;
	$: scrollSpan = Math.max(0, span - visibleAmount);

	$: percentValue = scrollSpan === 0 ? 0 : (value - min) / scrollSpan;

	let thumb: HTMLDivElement;
	let dragging = false;
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
	{...$$restProps}
	role="scrollbar"
	class:unneeded={Math.abs(percent - 1) < 0.000000001}
	aria-orientation={orientation}
	aria-controls={controls}
	aria-valuenow={value}
	aria-valuemin={min}
	aria-valuemax={max}
	{tabindex}
	on:mousedown|self={onBarMouseDown}
>
	<div
		role="presentation"
		on:mousedown|stopPropagation={onThumbMouseDown}
		bind:this={thumb}
		class="thumb"
		class:dragging
		style="--percent: {percent}; --value: {percentValue};"
	/>
</div>

<style>
	div[role="scrollbar"] {
		background-color: var(--scrollbar-bg, transparent);
	}
	div[role="scrollbar"].unneeded {
		visibility: hidden;
	}
	div[role="scrollbar"] .thumb {
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
	div[role="scrollbar"] .thumb:hover,
	div[role="scrollbar"] .thumb.dragging {
		background-color: var(
			--scrollbar-active-thumb-bg,
			var(--ui3, rbga(256, 256, 256, 0.4))
		);
	}
	div[role="scrollbar"][aria-orientation="horizontal"] .thumb {
		min-width: 45px;
		height: 100%;
		--thumb-width: calc(100% * var(--percent, 1));
		width: var(--thumb-width);
		left: calc(calc(100% - var(--thumb-width)) * var(--value, 0));
	}
	div[role="scrollbar"][aria-orientation="vertical"] .thumb {
		min-height: 45px;
		width: 100%;
		--thumb-height: calc(100% * var(--percent, 1));
		height: var(--thumb-height);
		top: calc(calc(100% - var(--thumb-height)) * var(--value, 0));
	}
</style>
