<script lang="ts">
	import TimelineView from "../../timeline/Timeline.svelte";
	import { TimelineNoteItem } from "../../timeline/TimelineNoteItem";
	import type {
		RulerValueDisplay,
		TimelineItem,
	} from "../../timeline/Timeline";
	import { type NamespacedWritableFactory } from "../../timeline/Persistence";
	import { createEventDispatcher, onMount } from "svelte";
	import { writable } from "svelte/store";
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
	import type { NotePropertyRepository } from "src/note/property/repository";
	import type { MutableNoteRepository } from "src/note/repository";
	import type { Note } from "src/note";
	import {
		TimelineOrderByNoteProperty,
		TimelineOrderNoteProperty,
	} from "src/timeline/order/ByNoteProperty";

	export let noteRepository: MutableNoteRepository;
	export let notePropertyRepository: NotePropertyRepository;

	export let viewModel: NamespacedWritableFactory<ObsidianNoteTimelineViewModel>;
	export let isNew: boolean = false;

	const dispatch = createEventDispatcher<{
		noteSelected: { note: Note; event?: Event };
		noteFocused: Note | undefined;
		createNote: {
			created?: number;
			modified?: number;
			properties?: Record<string, number>;
		};
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

	let itemsById: Map<string, TimelineNoteItem> = new Map();
	let items: TimelineNoteItem[] = [];

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
		const note = itemsById.get(item.id())?.note;
		if (note == null) {
			return;
		}

		dispatch("noteSelected", { note, event });
	}

	let order: TimelineOrderByNoteProperty;

	function selectedProperty() {
		return order.selectedProperty();
	}
	async function createItem(item: { value: number }) {
		const property = order.selectedProperty();
		let creation;
		if (property === TimelineOrderNoteProperty.Created) {
			creation = { created: item.value };
		} else if (property === TimelineOrderNoteProperty.Modified) {
			creation = { modified: item.value };
		} else {
			creation = {
				properties: {
					[property.name()]: property.sanitizeValue(item.value),
				},
			};
		}

		dispatch("createNote", creation);
	}

	let timelineView: TimelineView;
	let display: RulerValueDisplay;
	onMount(async () => {
		const orderSettings = viewModel
			.namespace("settings")
			.namespace("property");

		order = await TimelineOrderByNoteProperty.create(
			notePropertyRepository,
			orderSettings,
		);

		display = order.selectedProperty().displayAs();

		items = (
			await Promise.all(
				(await noteRepository.listAll()).map(async (note) => {
					const item = new TimelineNoteItem(note, selectedProperty);
					itemsById.set(item.id(), item);
					if (await $activeFilter.matches(item.note)) {
						return item;
					}
				}),
			)
		).filter((item) => !!item);

		const groups = timelineItemGroups.listGroups();
		if (groups.length > 0) {
			timelineItemGroups.applyFileToGroup(groups[0].id, groups[0].query);
		}

		let currentFilteringId = 0;

		activeFilter.subscribe(async (newFilter) => {
			const filteringId = currentFilteringId + 1;
			currentFilteringId = filteringId;
			const newItems = [];
			for (const item of Array.from(itemsById.values())) {
				if (currentFilteringId !== filteringId) break;
				if (await newFilter.matches(item.note)) {
					newItems.push(item);
				}
			}
			items = newItems;
		});

		if (isNew) {
			timelineView.zoomToFit(items);
		}
	});

	let groupUpdates: TimelineNoteItem[] = [];
	let scheduledUpdate: ((listener: () => void) => void) | undefined;
	function scheduleItemUpdate() {
		if (scheduledUpdate != null) return scheduledUpdate;

		let updateListeners: (() => void)[] = [];
		setTimeout(async () => {
			scheduledUpdate = undefined;
			if (groupUpdates.length > 0) {
				const groups = groupsRepo.list();
				const tasks = groupUpdates.map(async (item) => {
					item._invalidateValueCache();
					const group = await selectGroupForFile(groups, item.note);
					item.applyGroup(group);
				});
				groupUpdates = [];
				await Promise.all(tasks);
			}
			timelineView?.refresh();
			updateListeners.forEach((listener) => listener());
		}, 250);

		scheduledUpdate = (listener) => {
			updateListeners.push(listener);
		};

		return scheduledUpdate;
	}

	async function onItemAdded(item: TimelineNoteItem) {
		if (await $activeFilter.matches(item.note)) {
			items.push(item);
			return scheduleItemUpdate();
		}
	}

	function getValueSelector(this: void) {
		return order.selectedProperty();
	}
	export async function addFile(file: Note) {
		if (timelineView == null) return;
		if (itemsById.has(file.id())) return;
		const item = new TimelineNoteItem(file, getValueSelector);
		itemsById.set(file.id(), item);
		return onItemAdded(item);
	}

	export function deleteFile(file: Note) {
		if (timelineView == null) return;
		const item = itemsById.get(file.id());
		if (item == null) return;
		if (itemsById.delete(file.id())) {
			items.remove(item);
			scheduleItemUpdate();
		}
	}

	export async function modifyFile(file: Note) {
		if (timelineView == null) return;
		const item = itemsById.get(file.id());
		if (item == null) return;

		groupUpdates.push(item);
		scheduleItemUpdate();
	}

	export async function renameFile(file: Note, oldPath: string) {
		if (timelineView == null) return;
		const item = itemsById.get(oldPath);
		if (item == null) return;
		itemsById.delete(oldPath);
		itemsById.set(file.id(), item);

		groupUpdates.push(item);
		scheduleItemUpdate();
	}

	export function focusOnNote(note: Note) {
		const item = itemsById.get(note.id());
		if (item == null) return;
		timelineView?.focusOnItem(item);
	}

	function onPropertySelected(property: TimelineOrderNoteProperty) {
		order.selectProperty(property);
		order = order;

		order.sortItems(items);
		items = items;
		timelineView.zoomToFit(items);
		display = property.displayAs();
	}
</script>

<TimelineView
	{items}
	namespacedWritable={viewModel}
	{display}
	bind:this={timelineView}
	on:select={(e) => openFile(e.detail.causedBy, e.detail.item)}
	on:focus={(e) =>
		dispatch("noteFocused", itemsById.get(e.detail.id())?.note)}
	on:create={(e) => createItem(e.detail)}
>
	<svelte:fragment slot="additional-settings">
		{#if order}
			<TimelinePropertySetting
				viewModel={settings.namespace("property")}
				{order}
				on:propertySelected={(event) =>
					onPropertySelected(event.detail)}
			/>
		{/if}
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
