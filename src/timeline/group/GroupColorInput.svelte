<script lang="ts">
	import type * as colors from "src/color";
	import type * as svelteElements from "svelte/elements";
	import { noop } from "src/utils/noop";

	interface Props extends svelteElements.HTMLInputAttributes {
		onchanged?(color: string): void;
		colorable: colors.ColoredColorable;
	}

	let { onchanged = noop, colorable, ...rest }: Props = $props();
	const color = {
		get value() {
			return colorable.color();
		},
		set value(color: string) {
			colorable.recolor(color);
			onchanged(color);
		},
	};
</script>

<input type="color" aria-label={"Click to change color\nDrag to reorder groups"} bind:value={color.value} {...rest} />

<style>
	input[type="color"] {
		margin: 0 2px 0 6px;
	}
</style>
