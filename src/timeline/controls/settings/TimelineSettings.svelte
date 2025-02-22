<script lang="ts">
	import {
		run,
		createBubbler,
		preventDefault,
		stopPropagation,
	} from "svelte/legacy";

	const bubble = createBubbler();
	import ActionButton from "../../../view/inputs/ActionButton.svelte";
	import LucideIcon from "src/obsidian/view/LucideIcon.svelte";
	import type { Collapsable } from "src/view/collapsable";
	import ControlGroup from "src/timeline/controls/ControlGroup.svelte";

	interface Props {
		collapsable: Collapsable;
		children?: import("svelte").Snippet;
	}

	let { collapsable, children }: Props = $props();

	let isOpen = $state(!collapsable.isCollapsed());
	function onNewCollapsable(collapsable: Props["collapsable"]) {
		isOpen = !collapsable.isCollapsed();
	}
	function onOpenChanged(collapsed: boolean) {
		if (collapsed) {
			collapsable.collapse();
		} else {
			collapsable.expand();
		}
		isOpen = !collapsable.isCollapsed();
	}

	run(() => {
		onNewCollapsable(collapsable);
	});
	run(() => {
		onOpenChanged(!isOpen);
	});
</script>

<ControlGroup>
	<details open={isOpen} class="timeline-view--timeline-settings">
		<summary>
			{#if !isOpen}
				<ActionButton
					class="toggle-button open-button clickable-icon"
					aria-label="Settings"
					data-tooltip-position="left"
					on:action={() => (isOpen = true)}
				>
					<LucideIcon id="settings" />
				</ActionButton>
			{:else}
				<ActionButton
					class="toggle-button close-button clickable-icon"
					aria-label="Close"
					data-tooltip-position="left"
					on:action={() => (isOpen = false)}
				>
					<LucideIcon id="x" />
				</ActionButton>
			{/if}
		</summary>
		<form onsubmit={stopPropagation(preventDefault(bubble("submit")))}>
			{@render children?.()}
		</form>
		<!-- <TimelineDisplaySettings
		namespacedWritable={namespacedWritable.namespace("display")}
	/>
	<CollapsableSection name="Layout">
		<span>Coming Soon!</span>
	</CollapsableSection> -->
	</details>
</ControlGroup>

<style>
	.timeline-view--timeline-settings[open] {
		width: var(--timeline-settings-width);
	}
	.timeline-view--timeline-settings:not([open]) {
		width: auto;
	}

	details.timeline-view--timeline-settings summary {
		list-style: none;
	}

	.timeline-view--timeline-settings {
		position: relative;
	}
	.timeline-view--timeline-settings[open] :global(.toggle-button) {
		position: absolute;
		top: 0;
		right: 0;
		z-index: 1;
	}

	.timeline-view--timeline-settings :global(.toggle-button) {
		padding: var(--timeline-settings-button-padding);
		border-bottom: 1px solid var(--background-modifier-border);
	}
	.timeline-view--timeline-settings :global(.toggle-button):hover {
		background-color: var(--interactive-hover);
	}

	.timeline-view--timeline-settings[open] :global(.toggle-button) {
		border: none;
	}
	.timeline-view--timeline-settings:not([open]) :global(.toggle-button) {
		background-color: var(--interactive-normal);
	}

	.timeline-view--timeline-settings :global(section.collapsable) {
		padding: var(--size-2-3) var(--size-4-3);
		border-bottom: 1px solid var(--background-modifier-border);
	}

	.timeline-view--timeline-settings :global(section.collapsable .header) {
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
	.timeline-view--timeline-settings
		:global(section.collapsable .header.clickable-icon):hover {
		background-color: var(--timeline-settings-background);
		color: var(--text-normal);
	}
	.timeline-view--timeline-settings
		:global(section.collapsable .header .svg-icon) {
		margin-inline-start: calc(-1 * var(--size-2-3));
	}

	.timeline-view--timeline-settings :global(section.collapsable .content) {
		padding-block: var(
			--nav-item-children-padding-start,
			var(--nav-item-children-padding-left)
		);
	}
</style>
