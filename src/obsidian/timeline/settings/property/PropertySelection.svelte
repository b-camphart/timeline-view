<script lang="ts">
	import Select from "src/view/inputs/Select.svelte";
	import PropertySelectionOption from "./PropertySelectionOption.svelte";
	import type { NotePropertyRepository } from "src/note/property/repository";
	import { NoteProperty } from "src/note/property/index";
	import {
		TIMELINE_PROPERTY_TYPES,
		type TimelinePropertyType,
	} from "./TimelineProperties";
	import { createEventDispatcher, onMount } from "svelte";

	const alwaysAvailableProperties = [
		NoteProperty.Created,
		NoteProperty.Modified,
	];

	export let properties: NotePropertyRepository;
	export let selectedProperty: string;

	const dispatch = createEventDispatcher<{
		selected: NoteProperty<TimelinePropertyType>;
	}>();

	let availableProperties: NoteProperty<TimelinePropertyType>[] =
		alwaysAvailableProperties;
	$: propertyNames = availableProperties.map((it) => it.name());
	$: propertyCount = availableProperties.length;
	let selectedIndex = -1;

	let selectView: Select | undefined;

	function select(index: number, event?: Event) {
		selectedProperty = propertyNames[index];
		selectedIndex = index;
		if (selectView != null) {
			selectView.hide(event);
		}
		dispatch("selected", availableProperties[selectedIndex]);
	}

	function onSelect(event: CustomEvent<number>) {
		select(event.detail, event);
	}

	function consider(event: CustomEvent<number>) {
		selectedIndex = event.detail;
	}

	function typeOf(index: number) {
		return availableProperties[index].type();
	}

	async function getPropertyList() {
		const propertyList = await properties.listPropertiesOfTypes(
			TIMELINE_PROPERTY_TYPES,
		);
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
	class="dropdown"
	itemCount={propertyCount}
	bind:this={selectView}
	on:showing={getPropertyList}
>
	<svelte:fragment slot="display">{selectedProperty}</svelte:fragment>
	<PropertySelectionOption
		slot="item"
		let:index
		{index}
		selected={selectedIndex === index}
		name={propertyNames[index]}
		type={typeOf(index)}
		on:select={onSelect}
		on:consider={consider}
	/>
</Select>

<style>
</style>
