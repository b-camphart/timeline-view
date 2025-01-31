<script lang="ts">
	import { run } from "svelte/legacy";

	import ToggleInput from "src/view/inputs/ToggleInput.svelte";

	import type { NumberPreferenceReaderWriter } from "./valuePreference";

	interface Props {
		property: NumberPreferenceReaderWriter;
		tabindex: number;
	}

	let { property, tabindex }: Props = $props();

	let useIntegers = $state(property.prefersIntegers());
	run(() => {
		if (useIntegers !== property.prefersIntegers()) {
			if (property.canBeChanged()) {
				if (useIntegers) property.useIntegers();
				else property.useFloats();
			}
			useIntegers = property.prefersIntegers();
		}
	});
</script>

<ToggleInput
	class="numeric-property-int-toggle"
	row
	name="Use whole numbers"
	hint="When creating a new note, round to the nearest whole number for this property value"
	{tabindex}
	mod="mod-small"
	bind:checked={useIntegers}
	disabled={!property.canBeChanged()}
/>

<style>
	:global(.numeric-property-int-toggle) {
		padding: var(--size-2-3) 0;
	}
</style>
