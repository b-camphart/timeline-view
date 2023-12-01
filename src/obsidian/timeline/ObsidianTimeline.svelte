<script lang="ts">
	import { TFile, type App, Keymap, type UserEvent } from "obsidian";
	import TimelineView from "../../timeline/Timeline.svelte";
	import { TimelineFileItem } from "./TimelineFileItem";
	import {
		filterByType,
		type Properties,
		type PropertyType,
	} from "../properties/Properties";
	import type {
		TimelineItem,
	} from "../../timeline/Timeline";
	import CollapsableSection from "../../view/CollapsableSection.svelte";
	import Row from "../../view/layouts/Row.svelte";
	import PropertySelection from "../properties/PropertySelection.svelte";
	import { getPropertySelector } from "../properties/NotePropertySelector";
	import { type NamespacedWritableFactory } from "../../timeline/Persistence";

	export let namespacedWritable: NamespacedWritableFactory;
	export let app: App;
	export let properties: Properties;

	let orderProperty = namespacedWritable.make("orderProperty", "created");
	$: displayPropertyAs = getPropertyDisplayType($orderProperty);

	const validPropertyTypes = ["number", "date", "datetime"] as const;
	let availableProperties: {
		[propertyName: string]: (typeof validPropertyTypes)[number];
	} = {
		created: "datetime",
		modified: "datetime",
		...filterByType(properties.listKnownProperties(), validPropertyTypes),
	};
	$: propertySelection = getPropertySelector(
		$orderProperty,
		availableProperties,
		app.metadataCache
	);

	let displayNoteNames = namespacedWritable.make("displayNoteNames", false);

	function getPropertyDisplayType(
		prop: string | undefined
	): "numeric" | "date" {
		if (prop === undefined) {
			return "numeric";
		}
		if (prop.toLocaleLowerCase() === "created") {
			return "date";
		} else if (prop.toLocaleLowerCase() === "modified") {
			return "date";
		} else {
			if (prop in availableProperties) {
				const type = availableProperties[prop];
				if (type === "date" || type === "datetime") {
					return "date";
				}
				return "numeric";
			}
			return "numeric";
		}
	}

	let files = app.vault.getMarkdownFiles();

	function openFile(event: Event | undefined, item: TimelineItem) {
		const file = app.vault.getAbstractFileByPath(item.id());
		if (file == null || !(file instanceof TFile)) {
			return;
		}
		const userEvent: UserEvent | null =
			event instanceof MouseEvent || event instanceof KeyboardEvent
				? event
				: null;

		app.workspace
			.getLeaf(userEvent ? Keymap.isModEvent(userEvent) : "tab")
			.openFile(file);
	}

	$: items = files.map(
		(file) => new TimelineFileItem(file, propertySelection)
	);

	export function addFile(file: TFile) {
		files.push(file);
		files = files;
	}

	export function deleteFile(file: TFile) {
		files = files.filter((it) => it.path !== file.path);
	}

	export function modifyFile(file: TFile) {
		files = files.map((it) => {
			if (it.path === file.path) {
				return file;
			}
			return it;
		});
	}

	export function renameFile(file: TFile, oldPath: string) {
		files = files.map((it) => {
			if (it.path === oldPath) {
				return file;
			}
			return it;
		});
	}

	let orderPropertyOptions: string[] = Object.keys(availableProperties);

	export function addProperty(name: string, type: PropertyType) {
		if (type === "number" || type === "date" || type === "datetime") {
			availableProperties[name] = type;
			orderPropertyOptions.push(name);
			availableProperties = availableProperties;
			orderPropertyOptions = orderPropertyOptions;
		}
	}

	export function removeProperty(name: string) {
		if (name in availableProperties) {
			delete availableProperties[name];
			orderPropertyOptions.remove(name);
			availableProperties = availableProperties;
			orderPropertyOptions = orderPropertyOptions;
		}
	}

	export function changePropertyType(name: string, type: PropertyType) {
		if (
			type === "number" ||
			type === "date" ||
			(type === "datetime" && name in availableProperties)
		) {
			availableProperties[name] = type;
			availableProperties = availableProperties;
		}
	}

	let timelineView: TimelineView;
	let previousOrderProperty = $orderProperty;
	$: if (timelineView && previousOrderProperty != $orderProperty) {
		timelineView.zoomToFit();
		previousOrderProperty = $orderProperty;
	}

	let propertySectionCollapsed = namespacedWritable
		.namespace("controls")
		.namespace("settings")
		.namespace("property")
		.make("collapsed", true);
</script>

<TimelineView
	{namespacedWritable}
	bind:displayDataPointNames={$displayNoteNames}
	{displayPropertyAs}
	{items}
	bind:this={timelineView}
	on:select={(e) => openFile(e.detail.causedBy, e.detail.item)}
>
	<svelte:fragment slot="additional-settings">
		<CollapsableSection
			name="Property"
			bind:collapsed={$propertySectionCollapsed}
		>
			<Row>
				<label for="orderPropertySelect">Name</label>
				<PropertySelection
					options={availableProperties}
					bind:selectedProperty={$orderProperty}
				/>
			</Row>
		</CollapsableSection>
		<CollapsableSection name="Filter">
			<span>Coming Soon!</span>
		</CollapsableSection>
		<CollapsableSection name="Groups">
			<span>Coming Soon!</span>
		</CollapsableSection>
	</svelte:fragment>
</TimelineView>

<style>
	:global(.timeline) {
		--timeline-stage-side-padding: 48px !important;
	}
	:global(.mouse-position-tooltip) {
		background-color: var(--background-primary);
	}
	:global(.ruler) :global(.label) {
		font-size: var(--file-header-font-size);
		font-weight: var(--file-header-font-weight);
		padding: 4px;
		border-right: var(--divider-color) var(--border-width) solid;
		border-bottom: var(--divider-color) var(--border-width) solid;
	}

	:global(.timeline-point) {
		background-color: var(--graph-node);
		transition: background-color 0.5s;
		cursor: pointer;
		width: var(--point-diameter);
		height: var(--point-diameter);
        margin: var(--margin-between-points);
		border-radius: 100%;
        display: flex;
        justify-content: center;
	}

	:global(.timeline-point.hover) {
		border: 2px solid var(--graph-node-focused);
		box-sizing: content-box;
		translate: -2px -2px;
		background-color: var(--graph-node-focused);
	}

	:global(.timeline-point) :global(.display-name) {
		background-color: var(--background-primary);
		white-space: nowrap;
		position: relative;
		top: calc(
			var(--point-diameter) + 8px
		);
		pointer-events: none;
	}

	:global(.timeline-controls) {
		max-height: calc(100% - var(--size-4-12));
		z-index: var(--layer-cover);
		font-size: var(--font-ui-medium);
		right: var(--size-4-2) !important;
		top: calc(26px + var(--size-4-2)) !important;
		gap: var(--size-4-2);
	}

	:global(.timeline-controls) :global(.control-group) {
		border-radius: var(--radius-s);
		background-color: var(--background-primary);
		border: 1px solid var(--background-modifier-border);
		box-shadow: var(--input-shadow);
		overflow: auto;
	}

	:global(.timeline-controls)
		:global(.control-group)
		:global(button:not(.close-button):not(.dropdown)) {
		border-radius: 0;
	}

	:global(.timeline-controls) :global(.control-item) {
		color: var(--text-muted);
		padding: var(--size-2-3) 0;
		border: none;
		align-items: center;
	}

	:global(.timeline-controls) :global(.control-item) :global(button) {
		box-shadow: none;
	}

	:global(.timeline-controls) :global(svg.svg-icon) {
		height: var(--icon-s);
		width: var(--icon-s);
		stroke-width: var(--icon-s-stroke-width);
	}

	:global(.timeline-controls) :global(button:not(.dropdown)) {
		padding: var(--size-4-2);
		border-bottom: 1px solid var(--background-modifier-border);
		height: auto;
	}

	:global(.timeline-controls) :global(button:not(.dropdown):hover) {
		color: var(--text-normal);
		box-shadow: none;
	}

	:global(.timeline-navigation-controls) {
		flex-shrink: 0;
	}

	:global(.timeline-navigation-controls) :global(.control-item) {
		padding: 0;
	}

	:global(.timeline-settings) {
		border-radius: var(--radius-m);
		position: absolute;
		padding: 0;
		background-color: var(--background-primary);
		overflow: auto;
	}

	:global(.timeline-settings::-webkit-scrollbar) {
		display: none;
	}

	:global(.timeline-settings.closed) {
		width: auto;
	}

	:global(.timeline-settings.open) {
		width: var(--graph-controls-width);
		max-height: calc(100% - var(--size-4-4));
		border: 1px solid var(--background-modifier-border);
		box-shadow: var(--shadow-s);
		--icon-s: 18px;
	}

	:global(.timeline-settings) :global(.close-button) {
		background-color: transparent;
		box-shadow: none;
		border: 0;
		top: var(--size-4-2) !important;
		right: var(--size-4-2) !important;
		padding: var(--size-2-2);
		color: var(--icon-color);
		border-radius: var(--clickable-icon-radius);
		opacity: var(--icon-opacity);
	}

	:global(.timeline-settings) :global(.close-button:hover) {
		color: var(--icon-color-hover);
		background-color: var(--background-modifier-hover);
	}

	:global(.timeline-settings) :global(.close-button) :global(svg) {
		stroke-width: var(--icon-stroke);
	}

	:global(.timeline-settings) :global(fieldset) {
		padding: var(--size-2-3) var(--size-4-3);
		border: 0;
		border-bottom: 1px solid var(--background-modifier-border);
		margin: 0;
	}

	:global(.timeline-settings) :global(fieldset.collapsable) :global(header) {
		align-items: baseline;
		display: flex;
		border-radius: var(--radius-s);
		color: var(--nav-item-color);
		font-size: var(--nav-item-size);
		line-height: var(--line-height-tight);
		font-weight: var(--nav-item-weight);
		margin-bottom: var(--size-2-1);
		position: relative;
		padding: var(--nav-item-parent-padding);
		padding-left: var(--size-4-4);
	}
	:global(.timeline-settings)
		:global(fieldset.collapsable)
		:global(header)
		:global(button) {
		position: absolute;
		margin-left: calc(-1 * var(--size-4-5));
		width: var(--size-4-4);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: var(--icon-opacity);
		color: var(--icon-color);
		flex: 0 0 auto;
		padding: 0;
		background-color: transparent;
		border: none;
	}
	:global(.timeline-settings)
		:global(fieldset.collapsable)
		:global(header)
		:global(button::before) {
		content: "\200b";
	}
	:global(.timeline-settings)
		:global(fieldset.collapsable)
		:global(header)
		:global(.svg-icon) {
		color: var(--nav-collapse-icon-color);
		stroke-width: 4px;
		width: 10px;
		height: 10px;
	}

	:global(.timeline-settings)
		:global(fieldset)
		:global(header)
		:global(legend) {
		font-weight: var(--font-semibold);
		font-size: var(--font-ui-small);
		color: var(--text-normal);
		margin: 0;
	}

	:global(.timeline-settings) :global(label) {
		font-size: var(--font-ui-small);
		line-height: var(--line-height-tight);
		color: var(--text-normal);
	}

	:global(.timeline-settings) :global(.text-input),
	:global(.timeline-settings) :global(.number-input),
	:global(.timeline-settings) :global(.row) {
		flex-direction: column;
		gap: var(--size-2-1);
	}

	:global(.timeline-settings) :global(.text-input) > :global(*),
	:global(.timeline-settings) :global(.number-input) > :global(*) {
		width: 100%;
	}

	:global(.timeline) :global(.toggle-input) {
		--timeline-toggle-thumb-width: var(--toggle-s-thumb-width) !important;
		--timeline-toggle-thumb-height: var(--toggle-s-thumb-height) !important;
	}
	:global(.timeline) :global(.toggle-input) :global([role="checkbox"]) {
		--timeline-toggle-box-height: calc(
			var(--toggle-s-thumb-height) + var(--toggle-s-border-width) * 2
		) !important;
		--timeline-toggle-box-width: var(--toggle-s-width) !important;

		background-color: var(--background-modifier-border-hover);
		box-shadow: inset 0 4px 10px rgba(0, 0, 0, 0.07),
			inset 0 0 1px rgba(0, 0, 0, 0.21);
		transition: box-shadow 0.15s ease-in-out, outline 0.15s ease-in-out,
			border 0.15s ease-in-out, opacity 0.15s ease-in-out;
		outline: 0 solid var(--background-modifier-border-focus);
		border-radius: var(--toggle-radius);
	}

	:global(.timeline)
		:global(.toggle-input.checked)
		:global([role="checkbox"]) {
		background-color: var(--interactive-accent);
	}

	:global(.timeline) :global(.toggle-input) :global(.thumb) {
		background-color: var(--toggle-thumb-color);
		border-radius: var(--toggle-thumb-radius);
		transition: transform 0.15s ease-in-out, width 0.1s ease-in-out,
			left 0.1s ease-in-out;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
		margin-top: var(--toggle-s-border-width);
	}

	:global(.combo-box-popup),
	:global(.select-dropdown) {
		background-color: var(--background-primary);
		max-width: 500px;
		border-radius: var(--radius-m);
		border: 1px solid var(--background-modifier-border);
		box-shadow: var(--shadow-s);
		z-index: var(--layer-notice);
		max-height: 300px;
		overflow-y: auto;
		padding: 0;
	}

	:global(.combo-box-popup) {
		padding: var(--size-2-3) !important;
	}

	:global(.select-dropdown) :global(ul) {
		max-height: 300px;
		overflow-y: auto;
		padding: var(--size-2-3);
	}
</style>
