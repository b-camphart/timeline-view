<script lang="ts">
	interface Props {
		text: string;
		position: number;
		style?: string;
		hidden?: true;
	}

	let { text, position, hidden, style = "" }: Props = $props();
</script>

<div
	class="timeline-view--ruler-label"
	aria-hidden={hidden}
	data-value={text}
	style="left: {position}px;{style}"
>
	{text}
</div>

<style>
	.timeline-view--ruler-label {
		border-right: var(--border-color) var(--border-width) solid;

		padding: var(--padding);
		font-size: var(--font-size);
		font-weight: var(--font-weight);
	}

	div {
		box-sizing: border-box !important;

		width: var(--label-width) !important;
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
