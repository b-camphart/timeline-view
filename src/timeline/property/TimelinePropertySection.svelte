<script module lang="ts">
</script>

<script lang="ts">
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import TimelineNoteSorterPropertySelect from "../sorting/TimelineNoteSorterPropertySelect.svelte";
	import { createEventDispatcher } from "svelte";
	import NumericPropertyIntToggle from "src/timeline/item/NumericPropertyIntToggle.svelte";
	import type { TimelinePropertySelector } from "src/timeline/property/TimelinePropertySelector";
	import type { TimelineProperty } from "src/timeline/property/TimelineProperty";
	import type { Writable } from "svelte/store";
	import ToggleInput from "src/view/inputs/ToggleInput.svelte";

	interface Props {
		collapsed: Writable<boolean>;
		selector: TimelinePropertySelector;
	}

	let { collapsed, selector }: Props = $props();

	const dispatch = createEventDispatcher<{
		propertySelected: TimelineProperty;
		secondaryPropertySelected: TimelineProperty;
		secondaryPropertyToggled: boolean;
	}>();
</script>

<CollapsableSection
	name="Property"
	bind:collapsed={$collapsed}
	class={"timeline-property-setting"}
>
	<TimelineNoteSorterPropertySelect
		tabindex={0}
		property={selector.timelineNoteSorterSelector.selectedProperty()}
		getProperties={() =>
			selector.timelineNoteSorterSelector.availableProperties()}
		on:selected={({ detail: property }) => {
			selector.timelineNoteSorterSelector.selectProperty(property);
			dispatch("propertySelected", selector.selectedProperty());
		}}
	/>

	<NumericPropertyIntToggle
		property={selector.selectedProperty()}
		tabindex={1}
	/>

	<section>
		<h6>
			<ToggleInput
				row
				tabindex={2}
				name="Secondary Property"
				bind:checked={() => selector.secondaryPropertyInUse(),
				(use) => {
					selector.timelineNoteSorterSelector.toggleSecondaryProperty(
						use,
					);
					dispatch("secondaryPropertyToggled", use);
				}}
			/>
		</h6>
		{#if selector.secondaryPropertyInUse()}
			<TimelineNoteSorterPropertySelect
				tabindex={3}
				property={selector.timelineNoteSorterSelector.secondaryProperty()}
				getProperties={() =>
					selector.timelineNoteSorterSelector.availableProperties()}
				on:selected={({ detail: property }) => {
					selector.timelineNoteSorterSelector.selectSecondaryProperty(
						property,
					);
					dispatch(
						"secondaryPropertySelected",
						selector.secondaryProperty(),
					);
				}}
			/>

			<NumericPropertyIntToggle
				property={selector.secondaryProperty()}
				tabindex={4}
			/>
		{/if}
	</section>
</CollapsableSection>

<style>
	:global(.timeline-property-setting .row) {
		padding: var(--size-2-3) 0;
	}
</style>
