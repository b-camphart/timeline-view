<script lang="ts">
	import { preventDefault } from "svelte/legacy";

	import { createEventDispatcher } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";
	interface Props {
		children?: import("svelte").Snippet;
		[key: string]: any;
	}

	let { children, ...rest }: Props = $props();

	const dispatch = createEventDispatcher<{
		action: { inputEvent: MouseEvent | KeyboardEvent };
	}>();

	function handleClick(event: MouseEvent) {
		dispatch("action", { inputEvent: event });
	}
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			event.preventDefault();
			dispatch("action", { inputEvent: event });
		}
	}
</script>

<button
	{...rest}
	onclick={(e) => {
		e.preventDefault();
		handleClick(e);
	}}
	onkeydown={handleKeydown}
>
	{@render children?.()}
</button>
