<script lang="ts">
	import Select from "src/view/inputs/Select.svelte";
	import PropertySelectionOption from "./TimelineNoteSorterPropertySelectOption.svelte";
	import { createEventDispatcher, onMount } from "svelte";
	import { TimelineNoteSorterProperty } from "src/timeline/sorting/TimelineNoteSorterProperty";

	const alwaysAvailableProperties = [
		TimelineNoteSorterProperty.Created,
		TimelineNoteSorterProperty.Modified,
	];

	interface Props {
		property: TimelineNoteSorterProperty;
		getProperties(): Promise<TimelineNoteSorterProperty[]>;
		tabindex: number;
	}

	let { property, getProperties, tabindex }: Props = $props();

	let selectedPropertyName = $state(property.name());

	const dispatch = createEventDispatcher<{
		selected: TimelineNoteSorterProperty;
	}>();

	let availableProperties: TimelineNoteSorterProperty[] = $state(
		alwaysAvailableProperties,
	);
	let propertyNames = $derived(availableProperties.map((it) => it.name()));
	let propertyCount = $derived(availableProperties.length);
	let consideredIndex = $state(-1);
	let selectedIndex = $state(-1);

	function select(index: number) {
		selectedPropertyName = propertyNames[index];
		selectedIndex = index;
		consideredIndex = -1;
		const selectedProperty = availableProperties[index];
		dispatch("selected", selectedProperty);
	}

	function onChanged(this: Select, event: CustomEvent<number>) {
		select(event.detail);
	}

	function consider(event: CustomEvent<number>) {
		consideredIndex = event.detail;
	}

	function typeOf(index: number) {
		return availableProperties[index].type();
	}

	async function getPropertyList() {
		const propertyList = await getProperties();
		availableProperties = propertyList;
		selectedIndex = propertyList.findIndex(
			(property) => property.name() === selectedPropertyName,
		);

		if (selectedIndex === -1) {
			select(0);
		}
	}

	function styleSelectDialog(this: Select) {
		this.getDialog()?.classList.add("timeline-property-select-popup");
	}

	onMount(() => {
		getPropertyList();
	});
</script>

<Select
	class="timeline-property-select"
	{tabindex}
	{selectedIndex}
	itemCount={propertyCount}
	on:changed={onChanged}
	on:showing={getPropertyList}
	on:shown={styleSelectDialog}
>
	{#snippet item({ index })}
		<PropertySelectionOption
			{index}
			selected={selectedIndex === index || consideredIndex === index}
			name={propertyNames[index]}
			type={typeOf(index)}
			on:consider={consider}
		/>
	{/snippet}
</Select>

<style>
	:global(.setting-item-control .timeline-property-select) {
		width: 100%;
	}
	:global(.timeline-property-select) {
		width: 100%;
		margin-block: var(--size-2-3);
	}
	:global(.timeline-property-select::before) {
		content: " ";
	}
	:global(.timeline-property-select[aria-expanded="true"]) {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
	}
	:global(.select-dropdown.timeline-property-select-popup) {
		background-color: var(--background-primary);
		border-bottom-left-radius: var(--radius-m);
		border-bottom-right-radius: var(--radius-m);
		border: 1px solid var(--background-modifier-border);
		box-shadow: var(--shadow-s);
		z-index: var(--layer-notice);

		max-width: 500px;
		max-height: 300px;
	}
	:global(.select-dropdown.timeline-property-select-popup ul) {
		max-height: 300px;
		overflow-y: auto;
		padding: var(--size-2-3);
	}
</style>
