<script lang="ts">
	import { DisplayType } from "src/timeline/ruler/labels";

	interface Props {
		displayType: DisplayType;
		value: number;
		text: string;
		position: number;
		style?: string;
		hidden?: true;
	}

	let {
		displayType,
		value,
		text,
		position,
		hidden,
		style = "",
	}: Props = $props();

	let width = $state(0);
	export function size() {
		return width;
	}
</script>

<div
	class="timeline-view--ruler-label"
	bind:offsetWidth={width}
	aria-hidden={hidden}
	data-value={value}
	data-value-text={displayType === DisplayType.Numeric
		? value.toLocaleString()
		: window.moment(value).toLocaleString()}
	style="--position:{position}px;{style}"
>
	{text}
</div>

<style>
	.timeline-view--ruler-label {
		left: var(--position);
		border-left: var(--border-color) var(--border-width) solid;

		padding: var(--padding);
		font-size: var(--font-size);
		font-weight: var(--font-weight);
	}

	div {
		box-sizing: border-box !important;
		width: fit-content;
	}
	div[aria-hidden] {
		visibility: hidden;
		bottom: 0;
	}
	div:not([aria-hidden]) {
		position: absolute;
		top: 0;
		height: 9999px;
	}
</style>
