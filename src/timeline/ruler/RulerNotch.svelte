<script lang="ts">
	interface Props {
		position: number;
	}

	let { position }: Props = $props();
</script>

<div class="timeline-view--ruler-notch" style="left: {position}px;"></div>

<style>
	.timeline-view--ruler-notch {
		border-left: var(--border-color) var(--border-width) solid;

		padding: var(--padding);
		font-size: var(--font-size);
		font-weight: var(--font-weight);
		bottom: -4px;
		height: 8px;
	}

	div {
		box-sizing: border-box !important;
		position: absolute;
	}
</style>
