<script lang="ts">
	import ToggleInput from "src/view/inputs/ToggleInput.svelte";

	import type { NumberPreferenceReaderWriter } from "./valuePreference";

	export let property: NumberPreferenceReaderWriter;
	export let tabindex: number;

	let useIntegers = property.prefersIntegers();
	$: if (useIntegers !== property.prefersIntegers()) {
		if (property.canBeChanged()) {
			if (useIntegers) property.useIntegers();
			else property.useFloats();
		}
		useIntegers = property.prefersIntegers();
	}
</script>

<ToggleInput
	class="numeric-property-int-toggle"
	name="Use whole numbers"
	hint="When creating a new note, round to the nearest whole number for this property value"
	{tabindex}
	mod="mod-small"
	bind:checked={useIntegers}
	disabled={!property.canBeChanged()}
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
