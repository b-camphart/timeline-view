<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";
	interface Props extends HTMLButtonAttributes {
		onaction?(cause: Event | null): void;
	}

	let { onaction, children, ...rest }: Props = $props();

	const dispatch = createEventDispatcher<{
		action: { inputEvent: MouseEvent | KeyboardEvent };
	}>();

	function handleClick(event: MouseEvent) {
		event.preventDefault();
		onaction?.(event);
		dispatch("action", { inputEvent: event });
	}
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Enter") {
			event.preventDefault();
			onaction?.(event);
			dispatch("action", { inputEvent: event });
		}
	}
</script>

<button {...rest} onclick={handleClick} onkeydown={handleKeydown}>
	{@render children?.()}
</button>
