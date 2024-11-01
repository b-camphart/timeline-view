<script lang="ts">
	import { getContext } from "svelte";
	import DateTimeIcon from "src/timeline/sorting/icons/DateTimeIcon.svelte";
	import DateIcon from "src/timeline/sorting/icons/DateIcon.svelte";
	import NumberIcon from "src/timeline/sorting/icons/NumberIcon.svelte";

	import { TimelineNoteSorterPropertyType } from "src/timeline/sorting/TimelineNoteSorterProperty";
	import ObsidianSuggestionItem from "src/obsidian/view/ObsidianSuggestionItem.svelte";
	import { noop } from "src/utils/noop";

	interface Props {
		selected: boolean;
		index: number;
		name: string;
		type: TimelineNoteSorterPropertyType;
		onconsider?(index: number): void;
		onselect?(index: number): boolean | void;
	}

	let { selected, index, name, type, onconsider = noop, onselect = noop }: Props = $props();

	const change = getContext<(index: number) => void>("change");

	function makeSelection() {
		if (onselect(index) !== false) {
			if (change != null) {
				change(index);
			}
		}
	}
</script>

<ObsidianSuggestionItem
	{selected}
	tabindex={index}
	onmouseenter={() => onconsider(index)}
	onfocusin={() => onconsider(index)}
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
