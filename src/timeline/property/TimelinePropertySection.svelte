<script module lang="ts">
</script>

<script lang="ts">
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import TimelineNoteSorterPropertySelect from "../sorting/TimelineNoteSorterPropertySelect.svelte";
	import { createEventDispatcher } from "svelte";
	import NumericPropertyIntToggle from "src/timeline/item/NumericPropertyIntToggle.svelte";
	import type { TimelinePropertySelector } from "src/timeline/property/TimelinePropertySelector";
	import type { TimelineProperty } from "src/timeline/property/TimelineProperty";
	import type { Writable } from "svelte/store";
	import ToggleInput from "src/view/inputs/ToggleInput.svelte";
	import { TimelineNoteSorterPropertyType } from "src/timeline/sorting/TimelineNoteSorterProperty";

	interface Props {
		collapsed: Writable<boolean>;
		selector: TimelinePropertySelector;
	}

	let { collapsed, selector }: Props = $props();

	const dispatch = createEventDispatcher<{
		propertySelected: TimelineProperty;
		secondaryPropertySelected: TimelineProperty;
		secondaryPropertyToggled: boolean;
		secondaryPropertyReinterpreted: "length" | "end";
	}>();

	const incompatibleTypes = $derived.by(() => {
		if (!selector.secondaryPropertyInUse()) {
			return false;
		}
		const primaryType = selector.timelineNoteSorterSelector
			.selectedProperty()
			.type();
		const secondaryType = selector.timelineNoteSorterSelector
			.secondaryProperty()
			.type();

		return (
			(primaryType === TimelineNoteSorterPropertyType.Number &&
				secondaryType !== TimelineNoteSorterPropertyType.Number) ||
			(primaryType !== TimelineNoteSorterPropertyType.Number &&
				secondaryType === TimelineNoteSorterPropertyType.Number)
		);
	});
</script>

{#snippet incompatibilityWarning()}
	{#if incompatibleTypes}
		<span class="warning"
			>These properties have different types and may be nonsensical.</span
		>
	{/if}
{/snippet}

<CollapsableSection
	name="Properties"
	bind:collapsed={$collapsed}
	class={"timeline-property-setting"}
>
	<section>
		<h6>Order by</h6>
		{@render incompatibilityWarning()}
		<TimelineNoteSorterPropertySelect
			tabindex={0}
			property={selector.timelineNoteSorterSelector.selectedProperty()}
			getProperties={() =>
				selector.timelineNoteSorterSelector.availableProperties()}
			on:selected={({ detail: property }) => {
				selector.timelineNoteSorterSelector.selectProperty(property);
				dispatch("propertySelected", selector.selectedProperty());
			}}
		/>

		<NumericPropertyIntToggle
			property={selector.selectedProperty()}
			tabindex={1}
		/>
	</section>

	<section>
		<h6>
			<ToggleInput
				row
				mod="mod-small"
				tabindex={2}
				name="Secondary Property"
				bind:checked={() => selector.secondaryPropertyInUse(),
				(use) => {
					selector.timelineNoteSorterSelector.toggleSecondaryProperty(
						use,
					);
					dispatch("secondaryPropertyToggled", use);
				}}
			/>
		</h6>
		{#if selector.secondaryPropertyInUse()}
			{@render incompatibilityWarning()}
			<TimelineNoteSorterPropertySelect
				tabindex={3}
				property={selector.timelineNoteSorterSelector.secondaryProperty()}
				getProperties={() =>
					selector.timelineNoteSorterSelector.availableProperties()}
				on:selected={({ detail: property }) => {
					selector.timelineNoteSorterSelector.selectSecondaryProperty(
						property,
					);
					dispatch(
						"secondaryPropertySelected",
						selector.secondaryProperty(),
					);
				}}
			/>

			<NumericPropertyIntToggle
				property={selector.secondaryProperty()}
				tabindex={4}
			/>
			<label>
				Interpret as <select
					class="dropdown"
					bind:value={() =>
						selector.secondaryPropertyInterpretation(),
					(value: "length" | "end") => {
						selector.interpretSecondaryPropertyAs(value);
						dispatch("secondaryPropertyReinterpreted", value);
					}}
				>
					<option value="length">Length</option>
					<option value="end">End</option>
				</select>
			</label>
		{/if}
	</section>
</CollapsableSection>

<style>
	:global(.timeline-property-setting .row) {
		padding: var(--size-2-3) 0;
	}
	section {
		font-size: var(--font-ui-small);
	}
	section:first-child h6 {
		margin: 0;
	}
	h6 {
		margin-bottom: 0;
	}
	label {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.warning {
		color: var(--text-warning);
	}
</style>
