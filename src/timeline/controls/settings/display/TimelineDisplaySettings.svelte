<script lang="ts">
	import { writable } from "svelte/store";
	import CollapsableSection from "../../../../view/CollapsableSection.svelte";
	import ToggleInput from "../../../../view/inputs/ToggleInput.svelte";
	import type { NamespacedWritableFactory } from "../../../Persistence";
	import type { TimelineDisplaySettingViewModel } from "./viewModel";

	interface Props {
		namespacedWritable?: 
		| NamespacedWritableFactory<TimelineDisplaySettingViewModel>
		| undefined;
	}

	let { namespacedWritable = undefined }: Props = $props();
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
		tabindex={0}
	/>
</CollapsableSection>
