<script module lang="ts">
	export const controlItem = "timeline-view--control-item";
</script>

<style>
	:global(.timeline-view--control-item) {
		background-color: var(--timeline-settings-background);
	}
	:global(.timeline-view--control-item.clickable-icon) {
		padding: var(--timeline-settings-button-padding);
	}

	:global(.timeline-view--control-item.clickable-icon) {
		background: var(--interactive-normal);
	}
	:global(.timeline-view--control-item.clickable-icon):hover {
		background: var(--interactive-hover);
	}
	:global(.timeline-view--control-item .clickable-icon) {
		background: var(--interactive-normal);
	}
	:global(.timeline-view--control-item .clickable-icon):hover {
		background: var(--interactive-hover);
	}
</style>
