<script lang="ts">
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import { createEventDispatcher } from "svelte";
	interface Props {
		name: string;
		value: string;
		summary?: string;
		class?: string;
	}

	let {
		name,
		value = $bindable(),
		summary = "",
		class: className = ""
	}: Props = $props();
	

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
	<input {id} type="text" bind:value onkeydown={onKeyDown} onfocusin={bubble('focusin')} onfocusout={bubble('focusout')} />
</div>

<style>
	.text-input {
		display: flex;
	}
</style>
