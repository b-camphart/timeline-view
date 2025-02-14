<script module lang="ts">
	const watchedElements = new Map<HTMLElement, (color: string) => void>();
	let watching = false;

	function getStyles() {
		if (watchedElements.size === 0) {
			watching = false;
			return;
		}

		for (const [element, setter] of watchedElements) {
			const style = window.getComputedStyle(element);
			setter(style.color);
		}

		requestAnimationFrame(getStyles);
	}

	function watch(element: HTMLElement, callback: (color: string) => void) {
		watchedElements.set(element, callback);
		if (!watching) {
			watching = true;
			requestAnimationFrame(getStyles);
		}
		return () => {
			watchedElements.delete(element);
			if (watchedElements.size === 0) {
				watching = false;
			}
		};
	}
</script>

<script lang="ts">
	import { onMount } from "svelte";

	let {
		name,
		value = $bindable(),
	}: {
		name: string;
		value: string;
	} = $props();

	const initialValue = value;

	let styled: HTMLElement;
	onMount(() => watch(styled, (color) => ((value = color), void 0)));
</script>

<prop style="color: var({name}, {initialValue})" bind:this={styled}></prop>

<style>
	prop {
		display: none;
	}
</style>
