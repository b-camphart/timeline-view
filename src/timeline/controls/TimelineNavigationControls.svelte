<script lang="ts">
	import SvgIcon from "../../view/SvgIcon.svelte";
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
			<SvgIcon>
				<line x1="12" y1="5" x2="12" y2="19" />
				<line x1="5" y1="12" x2="19" y2="12" />
			</SvgIcon>
		</ActionButton>
	</li>
	<li class="control-item">
		<ActionButton
			aria-label="Zoom Out"
			on:action={triggerZoomOut}
			class="clickable-icon"
		>
			<SvgIcon>
				<line x1="5" y1="12" x2="19" y2="12" />
			</SvgIcon>
		</ActionButton>
	</li>
	<li class="control-item">
		<ActionButton
			aria-label="Zoom to Fit"
			on:action={triggerZoomToFit}
			class="clickable-icon"
		>
			<SvgIcon>
				<path d="M8 3H5a2 2 0 0 0-2 2v3" />
				<path d="M21 8V5a2 2 0 0 0-2-2h-3" />
				<path d="M3 16v3a2 2 0 0 0 2 2h3" />
				<path d="M16 21h3a2 2 0 0 0 2-2v-3" />
			</SvgIcon>
		</ActionButton>
	</li>
	<li class="control-item">
		<ActionButton
			aria-label="Scroll to Zero"
			on:action={triggerScrollToZero}
			class="clickable-icon"
		>
			<SvgIcon>
				<path d="M3 19V5" />
				<path d="m13 6-6 6 6 6" />
				<path d="M7 12h14" />
			</SvgIcon>
		</ActionButton>
	</li>
	<li class="control-item">
		<ActionButton
			aria-label="Scroll to First"
			on:action={triggerScrollToFirst}
			class="clickable-icon"
		>
			<SvgIcon>
				<path d="m12 19-7-7 7-7" />
				<path d="M19 12H5" />
			</SvgIcon>
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
