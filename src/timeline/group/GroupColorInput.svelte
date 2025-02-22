<script lang="ts">
	interface Props {
		onmousedown?(event: MouseEvent & { currentTarget: HTMLElement }): void;
		/** @bindable */
		color: string;
	}

	let { onmousedown = undefined, color = $bindable() }: Props = $props();
</script>

<input
	type="color"
	aria-label={"Click to change color\nDrag to reorder groups"}
	data-tooltip-position="left"
	bind:value={color}
	{onmousedown}
/>

<style>
	input[type="color"] {
		margin: 0 2px 0 6px;
	}
</style>
