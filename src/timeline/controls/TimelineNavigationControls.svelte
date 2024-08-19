<script lang="ts">
	import LucideIcon from "src/obsidian/view/LucideIcon.svelte";
	import ActionButton from "../../view/inputs/ActionButton.svelte";
	import type { TimelineNavigation } from "./TimelineNavigation";

	export let navigation: TimelineNavigation;

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

<menu class="timeline-navigation-controls">
	<li class="control-item">
		<ActionButton
			aria-label="Zoom In"
			on:action={triggerZoomIn}
			class="clickable-icon"
		>
			<LucideIcon id="plus" />
		</ActionButton>
	</li>
	<li class="control-item">
		<ActionButton
			aria-label="Zoom Out"
			on:action={triggerZoomOut}
			class="clickable-icon"
		>
			<LucideIcon id="minus" />
		</ActionButton>
	</li>
	<li class="control-item">
		<ActionButton
			aria-label="Zoom to Fit"
			on:action={triggerZoomToFit}
			class="clickable-icon"
		>
			<LucideIcon id="scan" />
		</ActionButton>
	</li>
	<li class="control-item">
		<ActionButton
			aria-label="Scroll to Zero"
			on:action={triggerScrollToZero}
			class="clickable-icon"
		>
			<LucideIcon id="arrow-left-to-line" />
		</ActionButton>
	</li>
	<li class="control-item">
		<ActionButton
			aria-label="Scroll to First"
			on:action={triggerScrollToFirst}
			class="clickable-icon"
		>
			<LucideIcon id="arrow-left" />
		</ActionButton>
	</li>
</menu>

<style>
	:global(menu.timeline-navigation-controls) {
		padding: 0;
	}
	:global(.timeline-navigation-controls) {
		overflow: hidden;
		background-color: var(--timeline-settings-background);
	}
	:global(menu.timeline-navigation-controls li.control-item) {
		list-style-type: none;
	}

	:global(.timeline-navigation-controls .control-item button) {
		padding: var(--timeline-settings-button-padding);
		border-bottom: 1px solid var(--background-modifier-border);
		border-radius: 0;
		background-color: var(--interactive-normal);
	}
	:global(.timeline-navigation-controls .control-item:last-child button) {
		border-bottom: none;
	}
</style>
