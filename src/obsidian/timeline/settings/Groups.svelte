<script lang="ts">
	import { get, writable } from "svelte/store";
	import type { NamespacedWritableFactory } from "../../../timeline/Persistence";
	import ActionButton from "../../../view/inputs/ActionButton.svelte";
    import { matchAllFilters, type FileFilter } from "../filter/FileFilter";
	import type { ItemGroup } from "./ItemGroup";
	import { parseFileSearchQuery } from "../filter/parser";
	import ItemGroupView from "./ItemGroup.svelte";

    const defaultGroupColors = [
        "#e05252",
        "#e0b152",
        "#b1e052",
        "#52e052",
        "#52e0b1",
        "#52b1e0",
        "#5252e0",
        "#b152e0",
        "#e052b1"
    ]

    export let groups: Omit<ItemGroup, 'filter'>[] = []

    function addGroup() {
        const color = defaultGroupColors[groups.length % defaultGroupColors.length];

        const group = {
            query: "",
            color
        }

        groups.push(group)
        groups = groups
    }

    function removeGroup(index: number) {
        groups.splice(index, 1)
        groups = groups
    }


</script>

{#each groups as group, index}
    <ItemGroupView 
        {group}
        on:change={() => groups = groups}
        on:remove={() => removeGroup(index)} 
    />
{/each}
<div class="graph-color-button-container">
    <ActionButton class="mod-cta" on:action={addGroup}>New group</ActionButton>
</div>

<style>
    .graph-color-button-container > :global(button) {
        margin-top: var(--size-2-3);
        border-radius: var(--button-radius) !important;
    }
</style>