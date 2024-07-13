<script lang="ts">
	import type { TimelineItem } from "src/timeline/Timeline";

	export let focus: {
		offsetTop: number;
		offsetLeft: number;
		offsetBottom: number;
		offsetCenterX: number;
		layoutItem: {
			item: TimelineItem;
		};
	};
</script>

<div
	class="timeline-point focus"
	style="top: {focus.offsetTop}px; left: {focus.offsetLeft}px;"
></div>

<style>
	.timeline-point.focus {
		position: absolute;
		margin: 0;
		pointer-events: none;
	}
</style>
