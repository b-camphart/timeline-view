<script lang="ts">
	import { createEventDispatcher, getContext } from "svelte";
	import DateTimeIcon from "src/timeline/sorting/icons/DateTimeIcon.svelte";
	import DateIcon from "src/timeline/sorting/icons/DateIcon.svelte";
	import NumberIcon from "src/timeline/sorting/icons/NumberIcon.svelte";

	import { TimelineNoteSorterPropertyType } from "src/timeline/sorting/TimelineNoteSorterProperty";
	import ObsidianSuggestionItem from "src/obsidian/view/ObsidianSuggestionItem.svelte";

	const dispatch = createEventDispatcher<{
		select: number;
		consider: number;
	}>();

	export let selected: boolean;
	export let index: number;
	export let name: string;
	export let type: TimelineNoteSorterPropertyType;

	const change = getContext<(index: number) => void>("change");

	function makeSelection() {
		if (dispatch("select", index, { cancelable: true })) {
			if (change != null) {
				change(index);
			}
		}
	}
</script>

<ObsidianSuggestionItem
	{selected}
	tabindex={index}
	on:mouseenter={() => dispatch("consider", index)}
	on:focusin={() => dispatch("consider", index)}
	on:click={makeSelection}
	on:keydown={(e) => (e.key === "Enter" ? makeSelection() : null)}
>
	{name}
	<svelte:fragment slot="icon">
		{#if type === TimelineNoteSorterPropertyType.DateTime}
			<DateTimeIcon />
		{:else if type === TimelineNoteSorterPropertyType.Date}
			<DateIcon />
		{:else if type === TimelineNoteSorterPropertyType.Number}
			<NumberIcon />
		{/if}
	</svelte:fragment>
</ObsidianSuggestionItem>
