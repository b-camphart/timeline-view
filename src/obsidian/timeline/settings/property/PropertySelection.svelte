<script lang="ts">
	import Select from "src/view/inputs/Select.svelte";
	import PropertySelectionOption from "./PropertySelectionOption.svelte";
	import { createEventDispatcher, onMount } from "svelte";
	import {
		TimelineOrderByNoteProperty,
		TimelineOrderNoteProperty,
	} from "src/timeline/order/ByNoteProperty";

	const alwaysAvailableProperties = [
		TimelineOrderNoteProperty.Created,
		TimelineOrderNoteProperty.Modified,
	];

	export let order: TimelineOrderByNoteProperty;
	export let tabindex: number;

	$: selectedProperty = order.selectedProperty().name();

	const dispatch = createEventDispatcher<{
		selected: TimelineOrderNoteProperty;
	}>();

	let availableProperties: TimelineOrderNoteProperty[] =
		alwaysAvailableProperties;
	$: propertyNames = availableProperties.map((it) => it.name());
	$: propertyCount = availableProperties.length;
	let consideredIndex = -1;
	let selectedIndex = -1;

	let selectView: Select | undefined;

	function select(index: number, event?: Event) {
		selectedProperty = propertyNames[index];
		selectedIndex = index;
		consideredIndex = -1;
		if (selectView != null && event?.type !== "change") {
			selectView.hide(event);
		}
		dispatch("selected", availableProperties[selectedIndex]);
	}

	function onSelect(event: CustomEvent<number>) {
		select(event.detail, event);
	}

	function consider(event: CustomEvent<number>) {
		consideredIndex = event.detail;
	}

	function typeOf(index: number) {
		return availableProperties[index].type();
	}

	async function getPropertyList() {
		const propertyList = await order.availableProperties();
		availableProperties = propertyList;
		selectedIndex = propertyList.findIndex(
			(property) => property.name() === selectedProperty,
		);

		if (selectedIndex === -1) {
			select(0);
		}
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
	bind:this={selectView}
	on:change={onSelect}
	on:showing={() => {
		getPropertyList();
	}}
	on:shown={() => {
		selectView
			?.getDialog()
			?.classList?.add("timeline-property-select-popup");
	}}
>
	<PropertySelectionOption
		slot="item"
		let:index
		{index}
		selected={selectedIndex === index || consideredIndex === index}
		name={propertyNames[index]}
		type={typeOf(index)}
		on:select={onSelect}
		on:consider={consider}
	/>
</Select>

<style>
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
