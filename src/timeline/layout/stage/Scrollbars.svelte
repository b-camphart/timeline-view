<script lang="ts">
	import type { ChangeEvent } from "src/view/controls/Scrollbar";
	import Scrollbar from "src/view/controls/Scrollbar.svelte";

	const {
		id,

		scrollTop,
		scrollHeight,

		minLeftOffset,
		maxRightOffset,

		tabIndex,

		onVScroll,
		onHScroll,

		onThumbDragStart,
		onThumbDragEnd,
	}: {
		id: string;
		scrollTop: number;
		scrollHeight: number;

		minLeftOffset: number;
		maxRightOffset: number;

		tabIndex: number;

		onVScroll(event: ChangeEvent): void;
		onHScroll(event: ChangeEvent): void;

		onThumbDragStart(): void;
		onThumbDragEnd(): void;
	} = $props();

	let clientHeight: number = $state(0);
	let offsetHeight: number = $state(0);
	let clientWidth: number = $state(0);
	let offsetWidth: number = $state(0);

	export function getClientWidth() {
		return clientWidth;
	}

	const scrollbarHeight = $derived(offsetHeight - clientHeight);
	const scrollbarWidth = $derived(offsetWidth - clientWidth);
</script>

<div
	bind:clientHeight
	bind:offsetHeight
	bind:clientWidth
	bind:offsetWidth
></div>
<Scrollbar
	orientation={"horizontal"}
	style={`--size: ${scrollbarHeight}px;`}
	controls={id}
	tabindex={tabIndex}
	value={0}
	visibleAmount={offsetWidth}
	min={Math.min(0, minLeftOffset)}
	max={Math.max(offsetWidth, maxRightOffset)}
	on:change={onHScroll}
	on:dragstart={onThumbDragStart}
	on:dragend={onThumbDragEnd}
/>
<Scrollbar
	orientation={"vertical"}
	style={`--size: ${scrollbarWidth}px;`}
	controls={id}
	tabindex={tabIndex + 1}
	value={scrollTop}
	visibleAmount={offsetHeight}
	min={0}
	max={scrollHeight}
	on:change={onVScroll}
	on:dragstart={onThumbDragStart}
	on:dragend={onThumbDragEnd}
/>

<style>
	div {
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		left: 0;
		padding: 0;
		margin: 0;

		overflow: scroll !important;
		visibility: hidden !important;
		pointer-events: none !important;
	}

	:global([role="scrollbar"]) {
		position: absolute;
	}
	:global([role="scrollbar"][aria-orientation="horizontal"]) {
		bottom: 0;
		left: 0;
		width: 100%;
	}
	:global([role="scrollbar"][aria-orientation="vertical"]) {
		top: 0;
		right: 0;
		height: 100%;
	}
</style>
