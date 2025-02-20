<script lang="ts">
	import { DisplayType } from "src/timeline/ruler/labels";

	interface Props {
		displayType: DisplayType;
		position: number;
		value: number;
	}

	let { displayType, position, value }: Props = $props();
</script>

<div
	class="timeline-view--ruler-notch"
	style:--position="{position}px"
	data-value={displayType === DisplayType.Numeric
		? value.toLocaleString()
		: window.moment(value).toLocaleString()}
></div>

<style>
	.timeline-view--ruler-notch {
		left: var(--position);
		border-left: var(--border-color) var(--border-width) solid;
		--height: 8px;
		height: var(--height);

		bottom: calc(var(--height) / -2);
	}

	div {
		box-sizing: border-box !important;
		position: absolute;
	}
</style>
