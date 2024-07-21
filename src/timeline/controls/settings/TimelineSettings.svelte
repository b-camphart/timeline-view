<script lang="ts">
	import { type NamespacedWritableFactory } from "../../Persistence";
	import CollapsableSection from "../../../view/CollapsableSection.svelte";
	import SvgIcon from "../../../view/SvgIcon.svelte";
	import ActionButton from "../../../view/inputs/ActionButton.svelte";
	import TimelineDisplaySettings from "./display/TimelineDisplaySettings.svelte";
	import type { TimelineSettingsViewModel } from "./viewModel";

	export let namespacedWritable: NamespacedWritableFactory<TimelineSettingsViewModel>;

	const isOpen = namespacedWritable.make("isOpen", false);

	function close() {
		$isOpen = false;
	}
	function open() {
		$isOpen = true;
	}
</script>

<form
	class="timeline-settings control-group{$isOpen ? ' open' : ' closed'}"
	on:submit|preventDefault|stopPropagation
>
	{#if !$isOpen}
		<ActionButton
			id="toggle-button"
			class="open-button clickable-icon"
			aria-label="Open"
			on:action={open}
		>
			<SvgIcon>
				<path
					d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
				/>
				<circle cx="12" cy="12" r="3" />
			</SvgIcon>
		</ActionButton>
	{:else}
		<ActionButton
			id="toggle-button"
			class="close-button clickable-icon"
			aria-label="Close"
			on:action={close}
		>
			<SvgIcon>
				<line x1="18" y1="6" x2="6" y2="18" />
				<line x1="6" y1="6" x2="18" y2="18" />
			</SvgIcon>
		</ActionButton>
	{/if}
	<slot />
	<!-- <TimelineDisplaySettings
		namespacedWritable={namespacedWritable.namespace("display")}
	/>
	<CollapsableSection name="Layout">
		<span>Coming Soon!</span>
	</CollapsableSection> -->
</form>

<style>
	.timeline-settings {
		width: var(--timeline-settings-width);
	}
	.timeline-settings.closed {
		width: auto;
	}
	form.closed > :global(*:not(#toggle-button)) {
		display: none;
	}

	.timeline-settings {
		position: relative;
	}
	.timeline-settings.open :global(#toggle-button) {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
	}

	.timeline-settings :global(button#toggle-button) {
		padding: var(--timeline-settings-button-padding);
		border-bottom: 1px solid var(--background-modifier-border);
	}
	.timeline-settings.open :global(#toggle-button) {
		border: none;
	}
	.timeline-settings.closed :global(#toggle-button) {
		background-color: var(--interactive-normal);
	}
	.timeline-settings :global(#toggle-button):hover {
		background-color: var(--interactive-hover);
	}

	.timeline-settings :global(section.collapsable) {
		padding: var(--size-2-3) var(--size-4-3);
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.timeline-settings :global(section.collapsable .header) {
		color: var(--text-normal);
		font-weight: var(--font-semibold);
		font-size: var(--font-ui-small);
		padding: var(--nav-item-parent-padding);
		padding-inline-start: 0;
		display: flex;
		justify-content: flex-start;
		width: 100%;
		gap: var(--size-2-3);
		margin-block-end: var(--size-2-1);
	}
	.timeline-settings
		:global(section.collapsable .header.clickable-icon):hover {
		background-color: var(--timeline-settings-background);
		color: var(--text-normal);
	}
	.timeline-settings :global(section.collapsable .header .svg-icon) {
		margin-inline-start: calc(-1 * var(--size-2-3));
	}

	.timeline-settings :global(section.collapsable .content) {
		padding-block: var(
			--nav-item-children-padding-start,
			var(--nav-item-children-padding-left)
		);
	}
</style>
