<script module lang="ts">
	function watch(element: HTMLElement) {}
</script>

<script lang="ts">
	import { onMount } from "svelte";

	const {
		onOffsetChange,
	}: {
		onOffsetChange(offsetBox: {
			left: number;
			top: number;
			right: number;
			bottom: number;
			width: number;
			height: number;
		}): void;
	} = $props();

	let element: HTMLElement | undefined = $state();

	const offset = $state({
		left: 0,
		top: 0,
		right: 0,
		bottom: 0,
		width: 0,
		height: 0,
	});

	$effect(() => {
		onOffsetChange(offset);
	});

	function getOffsets() {
		if (element == null) return;
		offset.left = element.offsetLeft ?? 0;
		offset.top = element.offsetTop ?? 0;
		offset.width = element.offsetWidth ?? 0;
		offset.height = element.offsetHeight ?? 0;

		const parent = element.offsetParent;
		if (parent == null) return;

		offset.right = parent.clientWidth - offset.width - offset.left;
		offset.bottom = parent.clientHeight - offset.height - offset.top;
	}

	onMount(() => {
		getOffsets();

		const handle = setInterval(getOffsets, 250);
		return () => clearInterval(handle);
	});
</script>

<div bind:this={element}></div>

<style>
	div {
		width: 100%;
		height: 100%;
		visibility: hidden !important;
		pointer-events: none;
		bottom: 0;
		right: 0;
	}
</style>
