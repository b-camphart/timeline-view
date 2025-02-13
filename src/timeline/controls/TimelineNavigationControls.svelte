<script lang="ts">
	import LucideIcon from "src/obsidian/view/LucideIcon.svelte";
	import ActionButton from "../../view/inputs/ActionButton.svelte";
	import type { TimelineNavigation } from "./TimelineNavigation";
	import ControlGroup from "src/timeline/controls/ControlGroup.svelte";
	import { controlItem } from "src/timeline/controls/ControlItem.svelte";

	interface Props {
		navigation: TimelineNavigation<never>;
	}

	let { navigation }: Props = $props();

	function triggerZoomIn() {
		navigation.zoomIn();
	}

	function triggerZoomOut() {
		navigation.zoomOut();
	}

	function triggerZoomToFit() {
		navigation.zoomToFit();
	}

	function triggerScrollToZero() {
		navigation.scrollToValue(0);
	}

	function triggerScrollToFirst() {
		navigation.scrollToFirst();
	}
</script>

<ControlGroup>
	<menu class="timeline-view--nav-controls">
		<li class={controlItem}>
			<ActionButton
				aria-label="Zoom In"
				data-tooltip-position="left"
				on:action={triggerZoomIn}
				class="clickable-icon"
			>
				<LucideIcon id="plus" />
			</ActionButton>
		</li>
		<li class={controlItem}>
			<ActionButton
				aria-label="Zoom Out"
				data-tooltip-position="left"
				on:action={triggerZoomOut}
				class="clickable-icon"
			>
				<LucideIcon id="minus" />
			</ActionButton>
		</li>
		<li class={controlItem}>
			<ActionButton
				aria-label="Zoom to Fit"
				data-tooltip-position="left"
				on:action={triggerZoomToFit}
				class="clickable-icon"
			>
				<LucideIcon id="scan" />
			</ActionButton>
		</li>
		<li class={controlItem}>
			<ActionButton
				aria-label="Scroll to Zero"
				data-tooltip-position="left"
				on:action={triggerScrollToZero}
				class="clickable-icon"
			>
				<LucideIcon id="arrow-left-to-line" />
			</ActionButton>
		</li>
		<li class={controlItem}>
			<ActionButton
				aria-label="Scroll to First"
				data-tooltip-position="left"
				on:action={triggerScrollToFirst}
				class="clickable-icon"
			>
				<LucideIcon id="arrow-left" />
			</ActionButton>
		</li>
	</menu>
</ControlGroup>

<style>
	menu.timeline-view--nav-controls {
		padding: 0;
		margin: 0;
	}
	.timeline-view--nav-controls {
		overflow: hidden;
		background-color: var(--timeline-settings-background);
	}
	li {
		list-style-type: none;
		margin: 0;
		padding: 0;
	}
	.timeline-view--nav-controls :global(.timeline-view--control-item button) {
		padding: var(--timeline-settings-button-padding);
		border-bottom: 1px solid var(--background-modifier-border);
		border-radius: 0;
	}
	.timeline-view--nav-controls
		:global(.timeline-view--control-item):last-child
		:global(button) {
		border-bottom: none;
	}
</style>
