<script lang="ts">
	import { createEventDispatcher } from "svelte";
	export let name: string;
	export let value: string;
	export let summary: string = "";
	let className: string = "";
	export { className as class };

    const dispatch = createEventDispatcher<{ action: { inputEvent: KeyboardEvent } }>()

	const id = "text_input_" + Math.random().toString(36).slice(2);

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            dispatch("action", { inputEvent: event })
        }
    }
</script>

<div class="text-input {className}">
	<label for={id} aria-label={summary}>{name}</label>
	<input {id} type="text" bind:value on:keydown={onKeyDown} on:focusin on:focusout />
</div>

<style>
	.text-input {
		display: flex;
	}
</style>
