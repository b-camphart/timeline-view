<script lang="ts">
	import type { Snippet } from "svelte";

	const {
		open = false,
		top,
		left,
		children,
		class: className,
	}: {
		open?: boolean;
		top?: string;
		left?: string;
		class?: string;
		children?: Snippet;
	} = $props();

	let dialog = $state<HTMLDialogElement | null>(null);
	$effect(() => {
		if (
			dialog !== null &&
			dialog.parentElement !== dialog.ownerDocument?.body
		) {
			dialog.ownerDocument?.body?.appendChild(dialog);
		}
	});
</script>

<dialog {open} style:top style:left bind:this={dialog} class={className}>
	{@render children?.()}
</dialog>

<style>
	dialog {
		padding: 0;
		border: none;
		margin: unset;
		background: none;
		z-index: 9999;
		position: fixed;
	}
</style>
