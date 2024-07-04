<script lang="ts">
	import TimelineView from "../../timeline/Timeline.svelte";
	import { TimelineFileItem } from "./TimelineFileItem";
	import type { TimelineItem } from "../../timeline/Timeline";
	import {
		getPropertySelector,
		type FilePropertySelector,
	} from "./settings/property/NotePropertySelector";
	import { type NamespacedWritableFactory } from "../../timeline/Persistence";
	import { createEventDispatcher, onMount } from "svelte";
	import { get, writable } from "svelte/store";
	import Groups from "./settings/groups/Groups.svelte";
	import {
		makeTimelineItemGroups,
		type TimelineItemGroups,
	} from "./settings/groups/Groups";
	import { GroupRepository } from "./settings/groups/persistence";
	import { selectGroupForFile } from "./settings/groups/selectGroupForFile";
	import TimelinePropertySetting from "./settings/property/TimelinePropertySetting.svelte";
	import type { ObsidianNoteTimelineViewModel } from "./viewModel";
	import TimelineFilterSetting from "./settings/filter/TimelineFilterSetting.svelte";
	import { getPropertyDisplayType } from "src/obsidian/timeline/settings/property/display";
	import type { NotePropertyRepository } from "src/note/property/repository";
	import { NoteProperty } from "src/note/property";
	import {
		isTimelinePropertyType,
		type TimelinePropertyType,
	} from "./settings/property/TimelineProperties";
	import type { NoteRepository } from "src/note/repository";
	import type { Note } from "src/note";

	export let notes: Map<string, TimelineFileItem>;
	export let noteRepository: NoteRepository;
	export let propertySelection: FilePropertySelector & {
		selector: FilePropertySelector;
	};
	export let viewModel: NamespacedWritableFactory<ObsidianNoteTimelineViewModel>;
	export let isNew: boolean = false;
	export let notePropertyRepository: NotePropertyRepository;

	const dispatch = createEventDispatcher<{
		noteSelected: { note: Note; event?: Event };
	}>();

	const settings = viewModel.namespace("settings");

	let filterSection = settings.namespace("filter");

	const filterText = filterSection.make("query", "");
	const activeFilter = writable(
		noteRepository.getInclusiveNoteFilterForQuery($filterText),
	);
	filterText.subscribe((newFilterText) =>
		activeFilter.set(
			noteRepository.getInclusiveNoteFilterForQuery(newFilterText),
		),
	);

	let items: TimelineFileItem[] = [];

	const groupsNamespace = settings.namespace("groups");
	const groupsRepo = new GroupRepository(
		groupsNamespace.make("groups", []),
		noteRepository,
	);
	let groupsView: Groups | undefined;

	let refreshTimeout: ReturnType<typeof setTimeout> | undefined;
	function scheduleRefresh() {
		if (refreshTimeout) return;

		refreshTimeout = setTimeout(() => {
			refreshTimeout = undefined;
			timelineView?.refresh();
		}, 250);
	}

	const timelineItemGroups: TimelineItemGroups = makeTimelineItemGroups(
		{
			groups: groupsRepo,
			items: {
				list() {
					return items;
				},
			},
			recolorProcess: undefined,
		},
		{
			presentNewGroup(group) {
				groupsView?.addGroup(group);
			},
			presentReorderedGroups(groups) {
				groupsView?.newOrder(groups);
			},
			presentRecoloredGroup(group) {
				groupsView?.recolorGroup(group);
			},
			presentRecoloredItem(item) {
				scheduleRefresh();
			},
			presentRecoloredItems(items) {
				scheduleRefresh();
			},
			presentRequeriedGroup(group) {
				groupsView?.changeGroupQuery(group);
			},
			hideGroup(groupId) {
				groupsView?.removeGroup(groupId);
			},
		},
	);

	function openFile(event: Event | undefined, item: TimelineItem) {
		const note = notes.get(item.id())?.obsidianFile;
		if (note == null) {
			return;
		}

		dispatch("noteSelected", { note, event });
	}

	let timelineView: TimelineView;
	let displayItemsAs: "numeric" | "date" = "date";
	onMount(async () => {
		items = (
			await Promise.all(
				Array.from(notes.values()).map(async (item) => {
					if (await $activeFilter.matches(item.obsidianFile)) {
						return item;
					}
				}),
			)
		).filter((item) => !!item);

		const orderPropertyName = get(
			viewModel
				.namespace("settings")
				.namespace("property")
				.make("property", "created"),
		);

		let orderProperty: NoteProperty<string> | null =
			await notePropertyRepository.getPropertyByName(orderPropertyName);

		if (!orderProperty || !isTimelinePropertyType(orderProperty.type())) {
			orderProperty = NoteProperty.Created;
		}

		propertySelection.selector = getPropertySelector(
			orderProperty as NoteProperty<TimelinePropertyType>,
		);
		displayItemsAs = getPropertyDisplayType(
			orderProperty as NoteProperty<TimelinePropertyType>,
		);
		for (const item of items) {
			item._invalidateValueCache();
		}
		items = items;

		const groups = timelineItemGroups.listGroups();
		if (groups.length > 0) {
			timelineItemGroups.applyFileToGroup(groups[0].id, groups[0].query);
		}

		let currentFilteringId = 0;

		activeFilter.subscribe(async (newFilter) => {
			const filteringId = currentFilteringId + 1;
			currentFilteringId = filteringId;
			const newItems = [];
			for (const item of Array.from(notes.values())) {
				if (currentFilteringId !== filteringId) break;
				if (await newFilter.matches(item.obsidianFile)) {
					newItems.push(item);
				}
			}
			items = newItems;
		});

		if (isNew) {
			timelineView.zoomToFit(items);
		}
	});

	let groupUpdates: TimelineFileItem[] = [];
	let itemUpdateTimeout: ReturnType<typeof setTimeout> | undefined;
	function scheduleItemUpdate() {
		if (itemUpdateTimeout != null) return;

		itemUpdateTimeout = setTimeout(async () => {
			itemUpdateTimeout = undefined;
			if (groupUpdates.length > 0) {
				const groups = groupsRepo.list();
				for (const item of groupUpdates) {
					item._invalidateValueCache();
					const group = await selectGroupForFile(
						groups,
						item.obsidianFile,
					);
					item.applyGroup(group);
				}
				groupUpdates = [];
			}
			timelineView?.refresh();
		}, 250);
	}

	export async function addFile(file: Note) {
		if (timelineView == null) return;
		const item = new TimelineFileItem(file, propertySelection);
		notes.set(file.id(), item);
		if (await $activeFilter.matches(file)) {
			items.push(item);
			scheduleItemUpdate();
		}
	}

	export function deleteFile(file: Note) {
		if (timelineView == null) return;
		const item = notes.get(file.id());
		if (item == null) return;
		if (notes.delete(file.id())) {
			items.remove(item);
			scheduleItemUpdate();
		}
	}

	export async function modifyFile(file: Note) {
		if (timelineView == null) return;
		const item = notes.get(file.id());
		if (item == null) return;

		groupUpdates.push(item);
		scheduleItemUpdate();
	}

	export async function renameFile(file: Note, oldPath: string) {
		if (timelineView == null) return;
		const item = notes.get(oldPath);
		if (item == null) return;
		notes.delete(oldPath);
		notes.set(file.id(), item);

		groupUpdates.push(item);
		scheduleItemUpdate();
	}

	function onPropertySelected(property: NoteProperty<TimelinePropertyType>) {
		if (timelineView == null) return;

		propertySelection.selector = getPropertySelector(property);
		for (const item of items) {
			item._invalidateValueCache();
		}
		items = items;
		timelineView.zoomToFit(items);
		displayItemsAs = getPropertyDisplayType(property);
	}
</script>

<TimelineView
	{items}
	namespacedWritable={viewModel}
	displayPropertyAs={displayItemsAs}
	bind:this={timelineView}
	on:select={(e) => openFile(e.detail.causedBy, e.detail.item)}
>
	<svelte:fragment slot="additional-settings">
		<TimelinePropertySetting
			viewModel={settings.namespace("property")}
			properties={notePropertyRepository}
			on:propertySelected={(event) => onPropertySelected(event.detail)}
		/>
		<TimelineFilterSetting viewModel={settings.namespace("filter")} />
		<Groups
			bind:this={groupsView}
			{timelineItemGroups}
			name="Groups"
			viewModel={groupsNamespace}
		/>
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
		top: calc(var(--point-diameter) + 8px);
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
		padding: var(--size-2-2) !important;
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

	:global(fieldset) {
		border: 0;
		margin: 0;
	}

	:global(.timeline-settings) > :global(fieldset) {
		padding: var(--size-2-3) var(--size-4-3);
		border-bottom: 1px solid var(--background-modifier-border);
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

	:global(.timeline-settings) :global(input[type="search"]) {
		width: 100%;
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
		box-shadow:
			inset 0 4px 10px rgba(0, 0, 0, 0.07),
			inset 0 0 1px rgba(0, 0, 0, 0.21);
		transition:
			box-shadow 0.15s ease-in-out,
			outline 0.15s ease-in-out,
			border 0.15s ease-in-out,
			opacity 0.15s ease-in-out;
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
		transition:
			transform 0.15s ease-in-out,
			width 0.1s ease-in-out,
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
