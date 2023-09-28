<script lang="ts">
	import { createEventDispatcher } from "svelte";
    export let name: string;
    export let value: number;
    export let summary: string = "";
    let className: string = "";
    export { className as class };
	import type { HTMLInputAttributes } from "svelte/elements";
	interface $$Props extends HTMLInputAttributes {
		name: string;
		value: number;
		summary?: string;
		class?: string;
	}
    const dispatch = createEventDispatcher<{ action: { inputEvent: KeyboardEvent } }>()

    const id = "number_input_" + Math.random().toString(36).slice(2);

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            dispatch("action", { inputEvent: event })
        }
    }
</script>

<div class="number-input {className}">
    <label for="{id}" aria-label={summary}>{name}</label>
    <input {id} type="number" bind:value on:keydown={onKeyDown} {...$$restProps} />
</div>

<style>
    .number-input {
        display: flex;
    }
</style>