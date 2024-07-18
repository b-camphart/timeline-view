<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import DateTimeIcon from "src/obsidian/timeline/settings/property/icons/DateTimeIcon.svelte";
	import DateIcon from "src/obsidian/timeline/settings/property/icons/DateIcon.svelte";
	import NumberIcon from "./icons/NumberIcon.svelte";
	import { TimelineOrderPropertyType } from "src/timeline/order/ByNoteProperty";

	const dispatch = createEventDispatcher<{
		select: number;
		consider: number;
	}>();

	export let selected: boolean;
	export let index: number;
	export let name: string;
	export let type: TimelineOrderPropertyType;
</script>

<div
	class="suggestion-item mod-complex"
	class:is-selected={selected}
	aria-selected={selected}
	role="option"
	tabindex={index}
	on:mouseenter={() => dispatch("consider", index)}
	on:focusin={() => dispatch("consider", index)}
	on:click={() => dispatch("select", index)}
	on:keydown={(e) => (e.key === "Enter" ? dispatch("select", index) : null)}
>
	<div class="suggestion-icon">
		<span class="suggestion-flair">
			{#if type === TimelineOrderPropertyType.DateTime}
				<DateTimeIcon />
			{:else if type === TimelineOrderPropertyType.Date}
				<DateIcon />
			{:else if type === TimelineOrderPropertyType.Number}
				<NumberIcon />
			{/if}
		</span>
	</div>
	<div class="suggestion-content">
		<div class="suggestion-title">
			{name}
		</div>
	</div>
</div>
