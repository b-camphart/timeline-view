<script lang="ts">
	import * as obsidian from "obsidian";
	import TimelineView from "../../timeline/Timeline.svelte";
	import { TimelineNoteItem } from "../../timeline/TimelineNoteItem";
	import type {
		RulerValueDisplay,
		TimelineItem,
	} from "../../timeline/Timeline";
	import { type NamespacedWritableFactory } from "../../timeline/Persistence";
	import { createEventDispatcher, onMount } from "svelte";
	import { get } from "svelte/store";
	import TimelinePropertySection from "../../timeline/property/TimelinePropertySection.svelte";
	import type { ObsidianNoteTimelineViewModel } from "./viewModel";
	import TimelineFilterSection from "../../timeline/filter/TimelineFilterSection.svelte";
	import type { NotePropertyRepository } from "src/note/property/repository";
	import type { MutableNoteRepository } from "src/note/repository";
	import type { Note } from "src/note";
	import { exists } from "src/utils/null";
	import { TimelinePropertySelector } from "src/timeline/property/TimelinePropertySelector";
	import type { TimelineProperty } from "src/timeline/property/TimelineProperty";
	import { TimelineItemQueryFilter } from "src/timeline/filter/TimelineItemQueryFilter";
	import { TimelineGroups } from "src/timeline/group/groups";
	import * as timelineGroup from "src/timeline/group/group";
	import type { TimelineItemColorSupplier } from "src/timeline/item/color";
	import { MutableSortedArray } from "src/utils/collections";

	export let noteRepository: MutableNoteRepository;
	export let notePropertyRepository: NotePropertyRepository;
	export let openModal: (
		open: (element: obsidian.Modal) => () => void,
	) => void;

	export let viewModel: NamespacedWritableFactory<ObsidianNoteTimelineViewModel>;
	export let isNew: boolean = false;
	export let oncontextmenu: (e: MouseEvent, notes: Note[]) => void = () => {};

	const dispatch = createEventDispatcher<{
		noteSelected: { note: Note; event?: Event };
		noteFocused: Note | undefined;
		createNote: {
			created?: number;
			modified?: number;
			properties?: Record<string, number>;
		};
		modifyNote: {
			note: Note;
			modification:
				| { created: number }
				| { modified: number }
				| { property: { name: string; value: number } };
		};
	}>();

	const settings = viewModel.namespace("settings");

	let itemsById: Map<string, TimelineNoteItem> = new Map();
	let items: MutableSortedArray<TimelineNoteItem> = new MutableSortedArray(
		(item) => item.value(),
	);

	let currentFilteringId = 0;
	const filterQuery = settings.namespace("filter").make("query", "");
	let filter = new TimelineItemQueryFilter(
		noteRepository,
		$filterQuery,
		async (query) => {
			filterQuery.set(query);

			const filteringId = currentFilteringId + 1;
			currentFilteringId = filteringId;
			const newItems = [];
			for (const item of Array.from(itemsById.values())) {
				if (currentFilteringId !== filteringId) break;
				if (await filter.accepts(item)) {
					newItems.push(item);
				}
			}
			items = new MutableSortedArray((item) => item.value(), ...newItems);
		},
	);

	const groupsNamespace = settings.namespace("groups");

	function saveGroups() {
		groupsNamespace.make("groups", []).set(
			timelineGroups.groups().map((group) => ({
				query: group.query(),
				color: group.color(),
			})),
		);
	}
	function createGroup(query: string, color: string) {
		const group = new timelineGroup.TimelineGroup(
			noteRepository,
			query,
			color,
		);
		group.onChanged = saveGroups;
		return group;
	}
	const timelineGroups = new TimelineGroups(
		get(groupsNamespace.make("groups", []))
			.map((group) => timelineGroup.schema.parseOrDefault(group))
			.map(({ query, color }) => createGroup(query, color)),
		(color) => createGroup("", color),
	);
	timelineGroups.onChanged = saveGroups;

	function openFile(event: Event | undefined, item: TimelineItem) {
		const note = itemsById.get(item.id())?.note;
		if (note == null) {
			return;
		}

		dispatch("noteSelected", { note, event });
	}

	let propertySelector: TimelinePropertySelector;

	async function createItem(item: { value: number }) {
		const property = propertySelector.selectedProperty();
		let creation;
		if (property.isCreatedProperty()) {
			creation = { created: item.value };
		} else if (property.isModifiedProperty()) {
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

	function moveItem(item: TimelineItem, value: number) {
		const noteItem = itemsById.get(item.id());
		if (noteItem == null) {
			return false;
		}

		const property = propertySelector.selectedProperty();
		value = property.sanitizeValue(value);

		if (property.isCreatedProperty()) {
			return dispatch(
				"modifyNote",
				{
					note: noteItem.note,
					modification: { created: value },
				},
				{ cancelable: true },
			);
		} else if (property.isModifiedProperty()) {
			return dispatch(
				"modifyNote",
				{
					note: noteItem.note,
					modification: { modified: value },
				},
				{ cancelable: true },
			);
		} else {
			return dispatch(
				"modifyNote",
				{
					note: noteItem.note,
					modification: {
						property: { name: property.name(), value: value },
					},
				},
				{ cancelable: true },
			);
		}
	}

	let timelineView: TimelineView;
	let display: RulerValueDisplay;
	onMount(async () => {
		const orderSettings = viewModel
			.namespace("settings")
			.namespace("property");

		const selectedPropertyName = orderSettings.make("property", "created");
		const propertyPreferences = orderSettings.make(
			"propertiesUseWholeNumbers",
			{},
		);

		propertySelector = await TimelinePropertySelector.sanitize(
			notePropertyRepository,
			{
				selectedPropertyName: get(selectedPropertyName),
				propertyPreferences: get(propertyPreferences),
			},
			(state) => {
				selectedPropertyName.set(state.selectedPropertyName);
				propertyPreferences.set(state.propertyPreferences);
			},
		);

		display = propertySelector.selectedProperty().displayedAs();

		for (const note of await noteRepository.listAll()) {
			const item = new TimelineNoteItem(
				note,
				getValueSelector,
				itemColorSupplier,
			);
			itemsById.set(item.id(), item);
			enqueueItemColorUpdate(item);
		}

		items = new MutableSortedArray(
			(item) => item.value(),
			...(await filter.filteredItems(itemsById.values())),
		);

		if (isNew) {
			timelineView.zoomToFit(items);
		}
	});

	const enqueueItemUpdate = (() => {
		const queue: (() => void)[] = [];
		let timer: null | ReturnType<typeof setTimeout> = null;

		return (update: () => void) => {
			queue.push(update);
			if (timer != null) return;

			timer = setTimeout(() => {
				timer = null;
				while (queue.length > 0) {
					queue.shift()!();
				}
				items = items;
			}, 250);
		};
	})();
	const itemColorSupplier = {
		cache: new Map<string, { index: number; color: string }>(),
		itemColorForNote(note: Note): string | undefined {
			return this.cache.get(note.id())?.color ?? undefined;
		},
	};
	itemColorSupplier satisfies TimelineItemColorSupplier;

	let itemRecolorQueueLength = 0;
	const enqueueItemColorUpdate = (() => {
		const queue: TimelineNoteItem[] = [];
		const uniqueQueue = new Set<TimelineNoteItem>();
		let timer: null | ReturnType<typeof setTimeout> = null;
		let tasks: Promise<void>[] = [];

		async function processBatch() {
			timer = null;

			const start = performance.now();
			if (tasks.length > 0) {
				await Promise.all(tasks);
			}
			tasks = [];

			while (
				queue.length > 0 &&
				performance.now() - start < 16 /* 1/60 */
			) {
				const item = queue.shift()!;
				uniqueQueue.delete(item);
				const groups = timelineGroups.groups();
				tasks.push(
					(async () => {
						for (let i = 0; i < groups.length; i++) {
							const group = groups[i];
							if (await group.noteFilter().matches(item.note)) {
								itemColorSupplier.cache.set(item.id(), {
									color: group.color(),
									index: i,
								});
								break;
							}
						}
						timelineView.invalidateColors();
					})(),
				);
			}
			itemRecolorQueueLength = queue.length;

			if (queue.length > 0) {
				timer = setTimeout(processBatch, 0);
			}
		}

		return (item: TimelineNoteItem) => {
			if (uniqueQueue.has(item)) return;
			uniqueQueue.add(item);
			queue.push(item);
			itemColorSupplier.cache.delete(item.id());
			itemRecolorQueueLength = queue.length;
			if (timer != null) return;

			timer = setTimeout(processBatch, 0);
		};
	})();

	function enqueueItemRecolorMatching(
		predicate: (item: TimelineNoteItem) => boolean,
	) {
		for (const item of itemsById.values()) {
			if (predicate(item)) {
				enqueueItemColorUpdate(item);
			}
		}
	}

	function getValueSelector(this: void) {
		return propertySelector.selectedProperty();
	}
	export async function addFile(file: Note) {
		if (timelineView == null) return;
		if (itemsById.has(file.id())) return;
		const item = new TimelineNoteItem(
			file,
			getValueSelector,
			itemColorSupplier,
		);
		itemsById.set(file.id(), item);
		if (await filter.accepts(item)) {
			enqueueItemUpdate(() => items.add(item));
		}
	}

	export function deleteFile(file: Note) {
		if (timelineView == null) return;
		const item = itemsById.get(file.id());
		if (item == null) return;
		if (itemsById.delete(file.id())) {
			enqueueItemUpdate(() => items.remove(item));
		}
	}

	export async function modifyFile(file: Note) {
		if (timelineView == null) return;
		const item = itemsById.get(file.id());
		if (item == null) return;

		enqueueItemColorUpdate(item);
		enqueueItemUpdate(() => {
			items.remove(item);
			items.add(item);
		});
	}

	export async function renameFile(file: Note, oldPath: string) {
		if (timelineView == null) return;
		const item = itemsById.get(oldPath);
		if (item == null) return;
		itemsById.delete(oldPath);
		itemsById.set(file.id(), item);

		enqueueItemColorUpdate(item);
		enqueueItemUpdate(() => {
			items.remove(item);
			items.add(item);
		});
	}

	export function focusOnNote(note: Note) {
		const item = itemsById.get(note.id());
		if (item == null) return;
		timelineView?.focusOnItem(item);
	}

	export function zoomToFit() {
		timelineView?.zoomToFit(items);
	}

	function onPropertySelected(property: TimelineProperty) {
		propertySelector = propertySelector;
		for (const item of itemsById.values()) {
			item._invalidateValueCache();
		}
		items = new MutableSortedArray((item) => item.value(), ...items);
		display = property.displayedAs();
		timelineView.zoomToFit(items);
	}

	function onPreviewNewItemValue(item: TimelineItem, value: number): number {
		return propertySelector.selectedProperty().sanitizeValue(value);
	}
</script>

<TimelineView
	{items}
	namespacedWritable={viewModel}
	{display}
	groups={timelineGroups}
	pendingGroupUpdates={itemRecolorQueueLength}
	controlBindings={{}}
	groupEvents={{
		onGroupAppended(group, groups) {
			// no-op
		},
		onGroupColored(index, group) {
			let effectCount = 0;
			for (const item of itemColorSupplier.cache.values()) {
				if (item.index === index) {
					item.color = group.color();
					effectCount++;
				}
			}
			if (effectCount > 0) {
				timelineView.invalidateColors();
			}
		},
		onGroupQueried(index, _group) {
			enqueueItemRecolorMatching((item) => {
				const def = itemColorSupplier.cache.get(item.id());
				// a new query could impact items that have no group, but not
				// items that have a group of a higher priority
				return def == null || def.index >= index;
			});
		},
		onGroupsReordered(from, to, _group, _groups) {
			// maintain consistency with group order
			for (const def of itemColorSupplier.cache.values()) {
				if (def.index >= from) {
					def.index -= 1;
				}
			}
			for (const def of itemColorSupplier.cache.values()) {
				if (def.index >= to) {
					def.index += 1;
				}
			}

			const minAffectedIndex = Math.min(from, to);
			enqueueItemRecolorMatching((item) => {
				const def = itemColorSupplier.cache.get(item.id());
				// re-order can't impact items that have no group
				return def != null && def.index >= minAffectedIndex;
			});
		},
		onGroupRemoved(index, _group, _groups) {
			// maintain consistency with group order
			for (const def of itemColorSupplier.cache.values()) {
				if (def.index >= index) {
					def.index -= 1;
				}
			}

			enqueueItemRecolorMatching((item) => {
				const def = itemColorSupplier.cache.get(item.id());
				// removing a group can't impact items that have no group
				return def != null && def.index >= index;
			});
		},
	}}
	bind:this={timelineView}
	on:select={(e) => openFile(e.detail.causedBy, e.detail.item)}
	on:focus={(e) =>
		dispatch("noteFocused", itemsById.get(e.detail.id())?.note)}
	on:create={(e) => createItem(e.detail)}
	onMoveItem={moveItem}
	{onPreviewNewItemValue}
	oncontextmenu={(e, triggerItems) => {
		const items = triggerItems
			.map((item) => itemsById.get(item.id()))
			.filter(exists);
		if (items.length === 0) return;
		oncontextmenu(
			e,
			items.map((it) => it.note),
		);
	}}
	openDialog={openModal}
>
	<svelte:fragment slot="additional-settings">
		{#if propertySelector}
			<TimelinePropertySection
				collapsed={settings
					.namespace("property")
					.make("collapsed", true)}
				selector={propertySelector}
				on:propertySelected={(event) =>
					onPropertySelected(event.detail)}
			/>
		{/if}
		<TimelineFilterSection
			collapsed={settings.namespace("filter").make("collapsed", true)}
			{filter}
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

		--timeline-selection-area-background: hsla(
			var(--color-accent-hsl),
			0.1
		);
		--timeline-selection-area-border: var(--timeline-item-color-hover);

		--timeline-settings-background: var(--background-primary);
		--timeline-settings-width: var(--graph-controls-width);
		--timeline-settings-button-padding: var(--size-4-2);
	}
</style>
