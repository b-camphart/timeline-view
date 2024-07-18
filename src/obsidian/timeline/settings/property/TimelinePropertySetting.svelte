<script lang="ts">
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import type { TimelinePropertySettingViewModel } from "./viewmodel";
	import PropertySelection from ".//PropertySelection.svelte";
	import type { NamespacedWritableFactory } from "src/timeline/Persistence";
	import { createEventDispatcher } from "svelte";
	import type {
		TimelineOrderByNoteProperty,
		TimelineOrderNoteProperty,
	} from "src/timeline/order/ByNoteProperty";

	export let viewModel: NamespacedWritableFactory<TimelinePropertySettingViewModel>;
	export let order: TimelineOrderByNoteProperty;
	const collapsed = viewModel.make("collapsed", true);

	const dispatch = createEventDispatcher<{
		propertySelected: TimelineOrderNoteProperty;
	}>();
</script>

<CollapsableSection name="Property" bind:collapsed={$collapsed}>
	<PropertySelection
		{order}
		on:selected={(event) => dispatch("propertySelected", event.detail)}
	/>
</CollapsableSection>

<style>
	:global(.timeline-property-setting .row) {
		padding: var(--size-2-3) 0;
	}
</style>
