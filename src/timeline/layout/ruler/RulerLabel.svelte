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
	class="label"
	aria-hidden={hidden}
	data-value={text}
	style="left: {position}px;{style}"
>
	{text}
</div>

<style>
	:global(.label) {
		border-right: var(--label-border-color) var(--label-border-width) solid;

		padding: var(--label-padding);
		font-size: var(--label-font-size);
		font-weight: var(--label-font-weight);
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
