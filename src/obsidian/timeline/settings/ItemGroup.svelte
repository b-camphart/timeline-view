<script lang="ts">
	import { writable } from "svelte/store";

	import ActionButton from "../../../view/inputs/ActionButton.svelte";
	import type { ItemGroup } from "./ItemGroup";
	import { createEventDispatcher } from "svelte";

    export let group: Omit<ItemGroup, 'filter'>;

    const dispatch = createEventDispatcher<{ remove: null, change: null }>()

    const query = writable(group.query)
    $: query.set(group.query)
    query.subscribe(newQuery => {
        if (newQuery !== group.query) {
            group.query = newQuery
            dispatch("change")
        }
    })

    const color = writable(group.color)
    $: color.set(group.color)
    color.subscribe(newColor => {
        if (newColor !== group.color) {
            group.color = newColor
            dispatch("change")
        }
    })

</script>
<fieldset>
    <input
        type="text"
        spellcheck="false"
        placeholder="Enter query..."
        bind:value={$query}
    />
    <input
        type="color"
        aria-label={"Click to change color\nDrag to reorder groups"}
        bind:value={$color}
    />
    <ActionButton class="clickable-icon" aria-label="Delete group" on:action={() => dispatch("remove")}>
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="svg-icon lucide-x"
            ><line x1="18" y1="6" x2="6" y2="18"></line><line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
            ></line></svg
        >
    </ActionButton>
</fieldset>


<style>
    fieldset {
        --swatch-height: 18px;
        --swatch-width: 18px;
        position: relative;
        display: flex;
        align-items: center;
        padding: 0 0 6px 0;
        transition: top 200ms ease-in-out;
    }
    input[type="color"] {
        margin: 0 2px 0 6px;
    }
    fieldset > :global(button) {
        padding: var(--size-2-2) !important;
    }
</style>