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

	interface Props {
		selected: boolean;
		index: number;
		name: string;
		type: TimelineNoteSorterPropertyType;
	}

	let { selected, index, name, type }: Props = $props();

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
	onmouseenter={() => dispatch("consider", index)}
	onfocusin={() => dispatch("consider", index)}
	onclick={makeSelection}
	onkeydown={(e) => (e.key === "Enter" ? makeSelection() : null)}
>
	{name}
	{#snippet icon()}
		{#if type === TimelineNoteSorterPropertyType.DateTime}
			<DateTimeIcon />
		{:else if type === TimelineNoteSorterPropertyType.Date}
			<DateIcon />
		{:else if type === TimelineNoteSorterPropertyType.Number}
			<NumberIcon />
		{/if}
	{/snippet}
</ObsidianSuggestionItem>
