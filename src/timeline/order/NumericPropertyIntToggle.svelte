<script lang="ts">
	import ToggleInput from "src/view/inputs/ToggleInput.svelte";
	import {
		TimelineOrderPropertyType,
		type TimelineOrderNoteProperty,
	} from "./ByNoteProperty";

	export let property: TimelineOrderNoteProperty;
	export let tabindex: number;

	let useIntegers = property.prefersWholeNumbers();
	$: if (useIntegers !== property.prefersWholeNumbers()) {
		if (useIntegers) property.useWholeNumbers();
		else property.useDecimalNumbers();

		useIntegers = property.prefersWholeNumbers();
	}
</script>

<ToggleInput
	class="numeric-property-int-toggle"
	name="Use whole numbers"
	hint="When creating a new note, round to the nearest whole number for this property value"
	{tabindex}
	mod="mod-small"
	bind:checked={useIntegers}
	disabled={property.type() !== TimelineOrderPropertyType.Number}
/>

<style>
	:global(.numeric-property-int-toggle) {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--size-2-3) 0;
		width: 100%;
	}
</style>
