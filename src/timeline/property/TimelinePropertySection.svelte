<script lang="ts">
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import type { Writable } from "svelte/store";
	import ToggleInput from "src/view/inputs/ToggleInput.svelte";
	import TimelinePropertySelect from "src/timeline/property/TimelinePropertySelect.svelte";
	import {
		TimelineProperty,
		type ObservableTimelineProperties,
		type ObservableTimelineProperty,
	} from "src/timeline/property/Property.svelte";
	interface Props {
		collapsed: Writable<boolean>;
		properties: ObservableTimelineProperties;
	}

	let { collapsed, properties }: Props = $props();

	const secondary = $derived(properties.secondary());

	const incompatibleTypes = $derived.by(() => {
		if (secondary === null) return false;

		const primaryType = properties.primary().type();
		const secondaryType = secondary.property().type();

		return (
			(primaryType === "number" && secondaryType !== "number") ||
			(primaryType !== "number" && secondaryType === "number")
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

{#snippet useIntToggle(tabIndex: number, property: ObservableTimelineProperty)}
	<ToggleInput
		class="numeric-property-int-toggle"
		row
		name="Use whole numbers"
		hint="When creating a new note, or making modifications, round to the nearest whole number for this property value"
		tabindex={tabIndex}
		mod="mod-small"
		bind:checked={() => property.usesInts(),
		(useInts) => property.useInts?.(useInts)}
		disabled={property.useInts === null}
	/>
{/snippet}

<CollapsableSection
	name="Properties"
	bind:collapsed={$collapsed}
	class={"timeline-property-setting"}
>
	<section>
		<h6>Order by</h6>
		{@render incompatibilityWarning()}
		<TimelinePropertySelect
			tabindex={0}
			alwaysAvailableProperties={[
				TimelineProperty.Created,
				TimelineProperty.Modified,
			]}
			property={properties.primary()}
			getProperties={() => properties.options()}
			onSelected={properties.setPrimaryProperty.bind(properties)}
		/>

		{@render useIntToggle(1, properties.primary())}
	</section>

	<section>
		<h6>
			<ToggleInput
				row
				mod="mod-small"
				tabindex={2}
				name="Secondary Property"
				bind:checked={() => secondary !== null,
				properties.enableSecondaryProperty.bind(properties)}
			/>
		</h6>
		{#if secondary !== null}
			{@render incompatibilityWarning()}
			<TimelinePropertySelect
				tabindex={0}
				alwaysAvailableProperties={[
					TimelineProperty.Created,
					TimelineProperty.Modified,
				]}
				property={secondary.property()}
				getProperties={() => properties.options()}
				onSelected={secondary.setProperty.bind(secondary)}
			/>

			{@render useIntToggle(4, secondary.property())}
			<label>
				Interpret as <select
					class="dropdown"
					bind:value={() => secondary.interpretedAs(),
					secondary.interpretAs.bind(secondary)}
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

	section :global(.numeric-property-int-toggle) {
		padding: var(--size-2-3) 0;
	}
</style>
