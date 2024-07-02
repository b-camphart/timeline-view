<script lang="ts">
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import type { TimelinePropertySettingViewModel } from "./viewmodel";
	import Row from "src/view/layouts/Row.svelte";
	import PropertySelection from ".//PropertySelection.svelte";
	import type { NamespacedWritableFactory } from "src/timeline/Persistence";
	import type { NotePropertyRepository } from "src/note/property/repository";
	import { createEventDispatcher } from "svelte";
	import type { NoteProperty } from "src/note/property";
	import type { TimelinePropertyType } from "./TimelineProperties";

	export let viewModel: NamespacedWritableFactory<TimelinePropertySettingViewModel>;
	export let properties: NotePropertyRepository;
	const collapsed = viewModel.make("collapsed", true);
	const property = viewModel.make("property", "created");

	const dispatch = createEventDispatcher<{
		propertySelected: NoteProperty<TimelinePropertyType>;
	}>();
</script>

<CollapsableSection name="Property" bind:collapsed={$collapsed}>
	<Row>
		<label for="orderPropertySelect">Name</label>
		<PropertySelection
			{properties}
			bind:selectedProperty={$property}
			on:selected={(event) => dispatch("propertySelected", event.detail)}
		/>
	</Row>
</CollapsableSection>
