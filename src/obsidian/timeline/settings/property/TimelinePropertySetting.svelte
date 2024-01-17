<script lang="ts">
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import type { TimelinePropertySettingViewModel } from "./viewmodel";
	import Row from "src/view/layouts/Row.svelte";
	import PropertySelection from ".//PropertySelection.svelte";
	import type { NamespacedWritableFactory } from "src/timeline/Persistence";
	import {
		type Properties,
	} from "src/obsidian/properties/Properties";
	import { timelineFileProperties } from './availableProperties'

	export let viewModel: NamespacedWritableFactory<TimelinePropertySettingViewModel>;
	export let properties: Properties;
	const collapsed = viewModel.make("collapsed", true);
	const property = viewModel.make("property", "created");

	const options = timelineFileProperties(properties)

</script>

<CollapsableSection name="Property" collapsed={$collapsed}>
	<Row>
		<label for="orderPropertySelect">Name</label>
		<PropertySelection
			options={$options}
			bind:selectedProperty={$property}
		/>
	</Row>
</CollapsableSection>
