<script lang="ts">
    import Select from "../../view/inputs/Select.svelte";
	import PropertySelectionOption from "./PropertySelectionOption.svelte";
    import { type TimelineProperties } from "./TimelineProperties";

    export let options: TimelineProperties;
    $: propertyNames = Object.keys(options);
    $: propertyCount = propertyNames.length
    export let selectedProperty: string;
    $: selectedIndex = propertyNames.indexOf(selectedProperty);

    let selectView: Select | undefined;

    function select(event: CustomEvent<number>) {
        selectedProperty = propertyNames[event.detail]
        if (selectView != null) {
            selectView.hide(event);
        }
    }

    function consider(event: CustomEvent<number>) {
        selectedIndex = event.detail;
    }

</script>

<Select class="dropdown" itemCount={propertyCount} bind:this={selectView}>
    <svelte:fragment slot="display">{selectedProperty}</svelte:fragment>
    <PropertySelectionOption 
        slot="item"
        let:index
        {index}
        selected={selectedIndex === index}
        name={propertyNames[index]}
        type={options[propertyNames[index]]}
        on:select={select}
        on:consider={consider}
    />
</Select>

<style>
</style>