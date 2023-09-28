<script lang="ts">
	import { createEventDispatcher } from "svelte";
	import type { TimelinePropertyType } from "./TimelineProperties";
	import DateTimeIcon from "./icons/DateTimeIcon.svelte";
	import DateIcon from "./icons/DateIcon.svelte";
	import NumberIcon from "./icons/NumberIcon.svelte";

    const dispatch = createEventDispatcher<{ select: number, consider: number }>();

    export let selected: boolean;
    export let index: number;
    export let name: string;
    export let type: TimelinePropertyType;

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
			{#if type === "datetime"}
				<DateTimeIcon />
			{:else if type === "date"}
				<DateIcon />
			{:else if type === "number"}
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
