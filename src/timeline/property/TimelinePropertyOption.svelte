<script lang="ts">
	import { getContext } from "svelte";
	import DateTimeIcon from "src/timeline/sorting/icons/DateTimeIcon.svelte";
	import DateIcon from "src/timeline/sorting/icons/DateIcon.svelte";
	import NumberIcon from "src/timeline/sorting/icons/NumberIcon.svelte";

	import ObsidianSuggestionItem from "src/obsidian/view/ObsidianSuggestionItem.svelte";
	import { TimelinePropertyType } from "src/timeline/property/Property.svelte";

	interface Props {
		selected: boolean;
		index: number;
		name: string;
		type: TimelinePropertyType;
		onSelect?(index: number): boolean | void;
		onConsidered?(index: number): void;
	}

	let { selected, index, name, type, onSelect, onConsidered }: Props =
		$props();

	const change = getContext<(index: number) => void>("change");

	function makeSelection() {
		if (!onSelect || onSelect(index) !== false) {
			if (change != null) {
				change(index);
			}
		}
	}

	const consider = $derived(
		onConsidered ? () => onConsidered(index) : undefined,
	);
</script>

<ObsidianSuggestionItem
	{selected}
	tabindex={index}
	onmouseenter={consider}
	onfocusin={consider}
	onclick={makeSelection}
	onkeydown={(e) => (e.key === "Enter" ? makeSelection() : null)}
>
	{name}
	{#snippet icon()}
		{#if type === TimelinePropertyType.DateTime}
			<DateTimeIcon />
		{:else if type === TimelinePropertyType.Date}
			<DateIcon />
		{:else if type === TimelinePropertyType.Number}
			<NumberIcon />
		{/if}
	{/snippet}
</ObsidianSuggestionItem>
