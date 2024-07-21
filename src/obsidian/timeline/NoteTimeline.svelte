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
		noteFocused: TimelineFileItem | undefined;
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
				timelineView?.invalidateColors();
			},
			presentRecoloredItems(items) {
				timelineView?.invalidateColors();
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

	export function focusOnNote(note: Note) {
		const item = notes.get(note.id());
		if (item == null) return;
		timelineView?.focusOnItem(item);
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
	on:focus={(e) => dispatch("noteFocused", notes.get(e.detail.id()))}
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
			viewModel={settings.namespace("groups")}
		/>
	</svelte:fragment>
</TimelineView>

<style>
	:global(body) {
		--timeline-background: var(--canvas-background);

		--timeline-ruler-label-font-size: var(--file-header-font-size);
		--timeline-ruler-label-font-weight: var(--file-header-font-weight);
		--timeline-ruler-label-border-color: var(--canvas-dot-pattern);
		--timeline-ruler-label-border-width: var(--divider-width);

		--timeline-padding: var(--size-4-2) var(--size-4-12) var(--size-4-12)
			var(--size-4-12);

		--timeline-item-color: var(--graph-node);
		--timeline-item-size: var(--size-4-4);
		--timeline-item-margin: var(--size-2-1);

		--timeline-item-color-hover: var(--graph-node-focused);
		--timeline-item-border-hover: var(--graph-node-focused);

		--timeline-item-color-active: var(--graph-node-active);
		--timeline-item-border-active: var(--graph-node-active);

		--timeline-item-color-focused: var(inherit);
		--timeline-item-border-focused: var(--graph-node-focused);

		--timeline-item-tooltip-background: var(--background-modifier-message);

		--timeline-settings-background: var(--background-primary);
		--timeline-settings-width: var(--graph-controls-width);
		--timeline-settings-button-padding: var(--size-4-2);
	}
</style>
