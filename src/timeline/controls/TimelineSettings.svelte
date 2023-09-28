<script lang="ts">
	import { type NamespacedWritableFactory } from "../Persistence";
	import CollapsableSection from "../../view/CollapsableSection.svelte";
	import SvgIcon from "../../view/SvgIcon.svelte";
	import ActionButton from "../../view/inputs/ActionButton.svelte";
	import TimelineDisplaySettings from "./TimelineDisplaySettings.svelte";
	import { writable } from "svelte/store";

	export let namespacedWritable: NamespacedWritableFactory | undefined = undefined;
	let className: string = "";
	export { className as class };

	export let displayDataPointNames: boolean;

	const isOpen = namespacedWritable?.make("isOpen", false) ?? writable(false);

	function close() {
		$isOpen = false;
	}
	function open() {
		$isOpen = true;
	}

</script>

<form
	class="timeline-settings{$isOpen ? ' open' : ' closed'} {className ?? ''}"
	on:submit|preventDefault|stopPropagation
>
	{#if $isOpen}
		<ActionButton class="close-button" aria-label="Close" on:action={close}>
			<SvgIcon>
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</SvgIcon>
		</ActionButton>
	{:else}
		<ActionButton class="open-button" aria-label="Open" on:action={open}>
			<SvgIcon>
				<path
					d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
				/>
				<circle cx="12" cy="12" r="3" />
			</SvgIcon>
		</ActionButton>
	{/if}
	<slot name="additional-settings"></slot>
	<TimelineDisplaySettings namespacedWritable={namespacedWritable?.namespace("display")} bind:displayDataPointNames={displayDataPointNames} />
	<CollapsableSection name="Layout">
		<span>Coming Soon!</span>
	</CollapsableSection>
</form>

<style>
	.timeline-settings {
		position: relative;
	}
	.timeline-settings.closed > :global(fieldset) {
		display: none;
	}
	.timeline-settings > :global(button[aria-label="Close"]) {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
	}
</style>
