<script lang="ts">
	import { writable } from "svelte/store";
	import CollapsableSection from "../../../../view/CollapsableSection.svelte";
	import ToggleInput from "../../../../view/inputs/ToggleInput.svelte";
	import type { NamespacedWritableFactory } from "../../../Persistence";
	import type { TimelineDisplaySettingViewModel } from "./viewModel";

	export let namespacedWritable:
		| NamespacedWritableFactory<TimelineDisplaySettingViewModel>
		| undefined = undefined;
	let collapsed =
		namespacedWritable?.make("collapsed", true) ?? writable(true);
	let displayNames =
		namespacedWritable?.make("names", false) ?? writable(false);
</script>

<CollapsableSection
	class="display-section"
	name="Display"
	bind:collapsed={$collapsed}
>
	<ToggleInput
		class="control-item display-notes-input"
		name="Names Below Points"
		bind:checked={$displayNames}
		tabIndex={0}
	/>
</CollapsableSection>
