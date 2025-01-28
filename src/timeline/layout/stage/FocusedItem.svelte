<script lang="ts">
	interface Props {
		focus: {
		offsetTop: number;
		offsetLeft: number;
	};
	}

	let { focus }: Props = $props();
</script>

<div
	class="timeline-item focus"
	style="top: {focus.offsetTop}px; left: {focus.offsetLeft}px;"
></div>

<style>
	:global(.timeline-item.focus) {
		border: 2px solid var(--timeline-item-border-focused);
		border-radius: 4px;
		box-sizing: content-box;
		translate: -2px -2px;

		background-color: var(--timeline-item-color-focused);
	}

	div {
		width: var(--timeline-item-diameter);
		height: var(--timeline-item-diameter);

		position: absolute;
		margin: 0;
		pointer-events: none;
	}
</style>
