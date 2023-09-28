<script lang="ts">
	import { createEventDispatcher } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";
    interface $$Props extends HTMLButtonAttributes {}
    
    const dispatch = createEventDispatcher<{ action: { inputEvent: MouseEvent | KeyboardEvent } }>()

    function handleClick(event: MouseEvent) {
        dispatch("action", { inputEvent: event })
    }
    function handleKeydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            event.preventDefault();
            dispatch("action", { inputEvent: event })
        }
    }

</script>

<button
    {...$$restProps}
    on:click|preventDefault={handleClick}
    on:keydown={handleKeydown}
>
    <slot></slot>
</button>