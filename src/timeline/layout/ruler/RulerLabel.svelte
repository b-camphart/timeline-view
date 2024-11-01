<script lang="ts">
	interface Props {
		text: string;
		position: number;
		style?: string;
	}

	let { text, position, style = "" }: Props = $props();
</script>

<div class="label" data-value={text} style="left: {position}px;{style}">
	{text}
</div>

<style>
	@property --timeline-ruler-label-border-color {
		syntax: "<color>";
		initial-value: white;
		inherits: true;
	}
	@property --timeline-ruler-label-border-width {
		syntax: "<length>";
		initial-value: 1px;
		inherits: true;
	}

	:global(.label) {
		border-right: var(--timeline-ruler-label-border-color)
			var(--timeline-ruler-label-border-width) solid;
		border-bottom: var(--timeline-ruler-label-border-color)
			var(--timeline-ruler-label-border-width) solid;

		height: var(--timeline-ruler-size, auto);
		padding: 4px;
		font-size: var(--timeline-ruler-label-font-size, 0.9em);
		font-weight: var(--timeline-ruler-label-font-weight, normal);
	}
	div {
		box-sizing: border-box !important;

		width: var(--label-width);
		position: absolute;
		bottom: 0;
	}
</style>
