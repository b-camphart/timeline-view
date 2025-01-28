<script lang="ts">
	import { run } from "svelte/legacy";

	import type * as colors from "src/color";
	import type * as svelteElements from "svelte/elements";

	interface Props {
		onmousedown?(event: MouseEvent & { currentTarget: HTMLElement }): void;
		onchanged?(color: string): void;
		colorable: colors.ColoredColorable;
		[key: string]: any;
	}

	let {
		onmousedown = undefined,
		onchanged = undefined,
		colorable,
		...rest
	}: Props = $props();

	let color = $state(colorable.color());
	function onNewColorable(colorable: colors.ColoredColorable) {
		color = colorable.color();
	}
	run(() => {
		onNewColorable(colorable);
	});

	function onColorInput(color: string) {
		if (color !== colorable.color()) {
			colorable.recolor(color);
			color = colorable.color();
			if (onchanged != null) onchanged(color);
		}
	}

	run(() => {
		onColorInput(color);
	});
</script>

<input
	type="color"
	aria-label={"Click to change color\nDrag to reorder groups"}
	data-tooltip-position="left"
	bind:value={color}
	{onmousedown}
	{...rest}
/>

<style>
	input[type="color"] {
		margin: 0 2px 0 6px;
	}
</style>
