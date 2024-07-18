<script lang="ts">
	import ToggleInput from "src/view/inputs/ToggleInput.svelte";
	import {
		TimelineOrderPropertyType,
		type TimelineOrderNoteProperty,
	} from "./ByNoteProperty";

	export let property: TimelineOrderNoteProperty;
	export let tabIndex: number;

	let useIntegers = property.prefersWholeNumbers();
	$: if (useIntegers !== property.prefersWholeNumbers()) {
		if (useIntegers) property.useWholeNumbers();
		else property.useDecimalNumbers();

		useIntegers = property.prefersWholeNumbers();
	}
</script>

{#if property.type() === TimelineOrderPropertyType.Number}
	<ToggleInput
		name="Use whole numbers"
        hint="When creating a new note, round to the nearest whole number for this property value"
		{tabIndex}
		bind:checked={useIntegers}
	/>
{/if}
