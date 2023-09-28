<script lang="ts">
	import { writable } from "svelte/store";
	import CollapsableSection from "../../view/CollapsableSection.svelte";
	import ToggleInput from "../../view/inputs/ToggleInput.svelte";
	import type { NamespacedWritableFactory } from "../Persistence";

    export let namespacedWritable: NamespacedWritableFactory | undefined = undefined;
    export let displayDataPointNames: boolean = false;

    let collapsed = namespacedWritable?.make("collapsed", true) ?? writable(true);
</script>

<CollapsableSection class="display-section" name="Display" bind:collapsed={$collapsed}>
    <ToggleInput
        class="control-item display-notes-input"
        name="Names Below Points"
        bind:checked={displayDataPointNames}
        tabIndex={0}
    />
</CollapsableSection>