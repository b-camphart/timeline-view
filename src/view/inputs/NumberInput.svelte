<script lang="ts">
	import { createEventDispatcher } from "svelte";
    
	import type { HTMLInputAttributes } from "svelte/elements";
    interface Props {
        name: string;
        value: number;
        summary?: string;
        class?: string;
        [key: string]: any
    }

    let {
        name,
        value = $bindable(),
        summary = "",
        class: className = "",
        ...rest
    }: Props = $props();
	
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
    <input {id} type="number" bind:value onkeydown={onKeyDown} {...rest} />
</div>

<style>
    .number-input {
        display: flex;
    }
</style>