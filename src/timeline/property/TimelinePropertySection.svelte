<script context="module" lang="ts">
</script>

<script lang="ts">
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import TimelineNoteSorterPropertySelect from "../sorting/TimelineNoteSorterPropertySelect.svelte";
	import { createEventDispatcher } from "svelte";
	import NumericPropertyIntToggle from "src/timeline/item/NumericPropertyIntToggle.svelte";
	import type { TimelinePropertySelector } from "src/timeline/property/TimelinePropertySelector";
	import type { TimelineProperty } from "src/timeline/property/TimelineProperty";
	import type { Writable } from "svelte/store";

	export let collapsed: Writable<boolean>;
	export let selector: TimelinePropertySelector;

	const dispatch = createEventDispatcher<{
		propertySelected: TimelineProperty;
	}>();
</script>

<CollapsableSection
	name="Property"
	bind:collapsed={$collapsed}
	class={"timeline-property-setting"}
>
	<TimelineNoteSorterPropertySelect
		tabindex={0}
		order={selector.timelineNoteSorterSelector}
		on:selected={() =>
			dispatch("propertySelected", selector.selectedProperty())}
	/>

	<NumericPropertyIntToggle
		property={selector.selectedProperty()}
		tabindex={1}
	/>
</CollapsableSection>

<style>
	:global(.timeline-property-setting .row) {
		padding: var(--size-2-3) 0;
	}
</style>
