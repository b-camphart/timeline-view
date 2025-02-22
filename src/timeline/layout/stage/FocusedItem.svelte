<script lang="ts">
	interface Props {
		focus: {
			offsetTop: number;
			offsetLeft: number;
			offsetWidth: number;
		};
	}

	let { focus }: Props = $props();
</script>

<div
	class="timeline-item focus"
	style:--top="{focus.offsetTop}px"
	style:--left="{focus.offsetLeft}px"
	style:--width="{focus.offsetWidth}px"
></div>

<style>
	:global(.timeline-item.focus) {
		border: 2px solid var(--timeline-item-border-focused);
		border-radius: 4px;
		box-sizing: content-box;
		top: calc(var(--top) - 2px);
		left: calc(var(--left) - 2px);
		width: var(--width);

		background-color: var(--timeline-item-color-focused);
	}

	div {
		height: var(--timeline-item-diameter);

		position: absolute;
		margin: 0;
		pointer-events: none;
	}
</style>
