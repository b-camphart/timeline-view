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

	interface Props {
		noteRepository: MutableNoteRepository;
		notePropertyRepository: NotePropertyRepository;
		openModal: (open: (element: obsidian.Modal) => () => void) => void;
		viewModel: NamespacedWritableFactory<ObsidianNoteTimelineViewModel>;
		isNew?: boolean;
		oncontextmenu?: (e: MouseEvent, notes: Note[]) => void;
		onResizeNotes?(
			mods: {
				note: Note;
				created?: number;
				modified?: number;
				properties?: Record<string, number>;
			}[],
		): Promise<void>;
	}

	let {
		noteRepository,
		notePropertyRepository,
		openModal,
		viewModel,
		isNew = false,
		oncontextmenu = () => {},
		onResizeNotes = async () => {},
	}: Props = $props();

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
			modification: {
				created?: number;
				modified?: number;
				properties: Record<string, number>;
			};
		};
	}>();

	const settings = viewModel.namespace("settings");

	let itemsById: Map<string, TimelineNoteItem> = new Map();
	let items: MutableSortedArray<TimelineNoteItem> = $state(
		new MutableSortedArray((item) => item.value()),
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
	const timelineGroups = $state(
		new TimelineGroups(
			get(groupsNamespace.make("groups", []))
				.map((group) => timelineGroup.schema.parseOrDefault(group))
				.map(({ query, color }) => createGroup(query, color)),
			(color) => createGroup("", color),
		),
	);
	timelineGroups.onChanged = saveGroups;

	function openFile(event: Event | undefined, item: TimelineItem) {
		const note = itemsById.get(item.id())?.note;
		if (note == null) {
			return;
		}

		dispatch("noteSelected", { note, event });
	}

	// @ts-ignore
	let propertySelector: TimelinePropertySelector = $state();

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

	function moveItem(item: TimelineItem, value: number, endValue: number) {
		const noteItem = itemsById.get(item.id());
		if (noteItem == null) {
			return false;
		}

		const modification = {
			created: undefined as number | undefined,
			modified: undefined as number | undefined,
			properties: {} as Record<string, number>,
		};

		const property = propertySelector.selectedProperty();
		// value = property.sanitizeValue(value);

		if (property.isCreatedProperty()) {
			modification["created"] = value;
		} else if (property.isModifiedProperty()) {
			modification["modified"] = value;
		} else {
			modification.properties[property.name()] = value;
		}

		if (
			propertySelector.secondaryPropertyInUse() &&
			// if we're using it as a length, moving the item has no effect
			propertySelector.secondaryPropertyInterpretation() === "end"
		) {
			if (endValue - value !== item.length()) {
				throw new Error(
					`end value should be ${value + item.length()}, but received ${endValue}`,
				);
			}
			const secondaryProperty = propertySelector.secondaryProperty();
			endValue = secondaryProperty.sanitizeValue(endValue);
			if (secondaryProperty.isCreatedProperty()) {
				modification["created"] = endValue;
			} else if (secondaryProperty.isModifiedProperty()) {
				modification["modified"] = endValue;
			} else {
				modification.properties[secondaryProperty.name()] = endValue;
			}
		}

		return dispatch(
			"modifyNote",
			{
				note: noteItem.note,
				modification,
			},
			{ cancelable: true },
		);
	}
	async function resizeItems(
		items: {
			item: TimelineItem;
			value: number;
			length: number;
			endValue: number;
		}[],
	) {
		if (!propertySelector.secondaryPropertyInUse()) return;
		const noteResizes = new Array<{
			note: Note;
			item: TimelineNoteItem;
			created?: number;
			modified?: number;
			properties: Record<string, number>;
		}>();

		function setValue(
			modification: (typeof noteResizes)[number],
			property: TimelineProperty,
			value: number,
		) {
			value = property.sanitizeValue(value);
			if (property.isCreatedProperty()) {
				modification.created = value;
			} else if (property.isModifiedProperty()) {
				modification.modified = value;
			} else {
				modification.properties[property.name()] = value;
			}
		}

		for (let i = 0; i < items.length; i++) {
			const { value, length, endValue } = items[i];
			const item = itemsById.get(items[i].item.id());
			if (!item) continue;
			const note = item.note;

			const modification = {
				note,
				item,
				created: undefined as number | undefined,
				modified: undefined as number | undefined,
				properties: {} as Record<string, number>,
			};

			setValue(modification, propertySelector.selectedProperty(), value);
			if (propertySelector.secondaryPropertyInterpretation() === "end") {
				setValue(
					modification,
					propertySelector.secondaryProperty(),
					endValue,
				);
			} else {
				setValue(
					modification,
					propertySelector.secondaryProperty(),
					length,
				);
			}

			noteResizes.push(modification);
		}

		await onResizeNotes(noteResizes);
		for (let i = 0; i < noteResizes.length; i++) {
			noteResizes[i].item._invalidateValueCache();
			noteResizes[i].item.lengthSelector = lengthOf;
		}
	}

	const secondaryPropertyInterpretedAs = viewModel
		.namespace("settings")
		.namespace("property")
		.namespace("secondaryProperty")
		.make("useAs", "end");

	// @ts-ignore
	let timelineView: TimelineView = $state();
	// @ts-ignore
	let display: RulerValueDisplay = $state();
	onMount(async () => {
		const orderSettings = viewModel
			.namespace("settings")
			.namespace("property");

		const selectedPropertyName = orderSettings.make("property", "created");
		const secondaryProperty = orderSettings.namespace("secondaryProperty");
		const secondaryPropertyName = secondaryProperty.make(
			"name",
			"modified",
		);
		const secondaryPropertyInUse = secondaryProperty.make("inUse", false);
		const propertyPreferences = orderSettings.make(
			"propertiesUseWholeNumbers",
			{},
		);

		propertySelector = await TimelinePropertySelector.sanitize(
			notePropertyRepository,
			{
				selectedPropertyName: get(selectedPropertyName),
				secondaryProperty: {
					name: get(secondaryPropertyName),
					inUse: get(secondaryPropertyInUse),
					useAs: get(secondaryPropertyInterpretedAs),
				},
				propertyPreferences: get(propertyPreferences),
			},
			(state) => {
				selectedPropertyName.set(state.selectedPropertyName);
				secondaryPropertyName.set(state.secondaryProperty.name);
				secondaryPropertyInUse.set(state.secondaryProperty.inUse);
				secondaryPropertyInterpretedAs.set(
					state.secondaryProperty.useAs,
				);
				propertyPreferences.set(state.propertyPreferences);
			},
		);

		display = propertySelector.selectedProperty().displayedAs();

		for (const note of noteRepository.listAll()) {
			const item = new TimelineNoteItem(
				note,
				getValueSelector,
				lengthOf,
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
			if (timer != null) {
				return;
			}

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

	let itemRecolorQueueLength = $state(0);
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
						itemColorSupplier.cache.delete(item.id());
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
			// itemColorSupplier.cache.delete(item.id());
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
	function lengthOf(note: Note) {
		if (!propertySelector.secondaryPropertyInUse()) {
			return 0;
		}
		const secondaryProperty = propertySelector.secondaryProperty();
		if ($secondaryPropertyInterpretedAs === "length") {
			const length = secondaryProperty.selectValueFromNote(note);
			if (length === null || length < 0) return 0;
			return length;
		}
		const start =
			propertySelector.selectedProperty().selectValueFromNote(note) ?? 0;
		const end = secondaryProperty.selectValueFromNote(note) ?? start;
		const length = end - start;
		if (length < 0) return 0;
		return length;
	}

	function summarizeNote(note: Note) {
		const primaryProperty = propertySelector.selectedProperty();
		const primaryValue = primaryProperty.selectValueFromNote(note);
		const primaryValueStr =
			primaryValue === null ? "" : display.displayValue(primaryValue);
		if (!propertySelector.secondaryPropertyInUse()) {
			return `${note.name()}\n[${primaryProperty.name()}: ${primaryValueStr}]`;
		}

		const secondaryProperty = propertySelector.secondaryProperty();
		const secondaryValue = secondaryProperty.selectValueFromNote(note);

		if (propertySelector.secondaryPropertyInterpretation() === "end") {
			const secondaryValueStr =
				secondaryValue === null
					? ""
					: display.displayValue(secondaryValue);
			const length =
				(secondaryValue ?? primaryValue ?? 0) - (primaryValue ?? 0);
			return `${note.name()}\n[${primaryProperty.name()}: ${primaryValueStr}] → [${secondaryProperty.name()}: ${secondaryValueStr}]\nlength: ${display.displayLength(length)}`;
		}

		const end = (primaryValue ?? 0) + (secondaryValue ?? primaryValue ?? 0);
		const secondaryValueStr =
			secondaryValue === null
				? ""
				: display.displayLength(secondaryValue);

		return `${note.name()}\n[${primaryProperty.name()}: ${primaryValueStr}] → ${display.displayValue(end)}\n[${secondaryProperty.name()}: ${secondaryValueStr}]`;
	}

	function summarizeItem(
		name: string,
		value: number,
		length: number,
		endValue: number,
	) {
		const primaryProperty = propertySelector.selectedProperty();
		const primaryValueStr = display.displayValue(value);
		if (!propertySelector.secondaryPropertyInUse()) {
			return `${name}\n[${primaryProperty.name()}: ${primaryValueStr}]`;
		}

		const secondaryProperty = propertySelector.secondaryProperty();
		const lengthStr = display.displayLength(length);
		const endValueStr = display.displayValue(endValue);

		if (propertySelector.secondaryPropertyInterpretation() === "end") {
			return `${name}\n[${primaryProperty.name()}: ${primaryValueStr}] → [${secondaryProperty.name()}: ${endValueStr}]\nlength: ${lengthStr}`;
		}
		return `${name}\n[${primaryProperty.name()}: ${primaryValueStr}] → ${endValueStr}\n[${secondaryProperty.name()}: ${lengthStr}]`;
	}

	export async function addFile(file: Note) {
		if (timelineView == null) return;
		if (itemsById.has(file.id())) return;
		const item = new TimelineNoteItem(
			file,
			getValueSelector,
			lengthOf,
			itemColorSupplier,
		);
		itemsById.set(file.id(), item);
		if (await filter.accepts(item)) {
			enqueueItemUpdate(() => {
				items.add(item);
			});
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

		const keep = await filter.accepts(item);

		enqueueItemColorUpdate(item);
		enqueueItemUpdate(() => {
			items.remove(item);
			item._invalidateValueCache();
			if (keep) {
				items.add(item);
			}
		});
	}

	export async function renameFile(file: Note, oldPath: string) {
		if (timelineView == null) return;
		const item = itemsById.get(oldPath);
		if (item == null) return;
		itemsById.delete(oldPath);
		itemsById.set(file.id(), item);

		const keep = await filter.accepts(item);

		enqueueItemColorUpdate(item);
		enqueueItemUpdate(() => {
			items.remove(item);
			if (keep) items.add(item);
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

	function onSecondaryPropertySelected(property: TimelineProperty) {
		for (const item of itemsById.values()) {
			item.lengthSelector = lengthOf;
		}
		timelineView!.refresh();
	}

	function onPreviewNewItemValue(item: TimelineItem, value: number): number {
		return propertySelector.selectedProperty().sanitizeValue(value);
	}
</script>

<TimelineView
	{items}
	previewItem={(name, value, length, endValue) => {
		return summarizeItem(name, value, length, endValue);
	}}
	summarizeItem={(item) => {
		const note = itemsById.get(item.id())?.note;
		if (!note)
			return summarizeItem(
				item.name(),
				item.value(),
				item.length(),
				item.value() + item.length(),
			);
		return summarizeNote(note);
	}}
	itemsResizable={propertySelector?.secondaryPropertyInUse() ?? false}
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
			const minAffectedIndex = Math.min(from, to);
			enqueueItemRecolorMatching((item) => {
				const def = itemColorSupplier.cache.get(item.id());
				// re-order can't impact items that have no group
				return def != null && def.index >= minAffectedIndex;
			});
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
		},
		onGroupRemoved(index, _group, _groups) {
			enqueueItemRecolorMatching((item) => {
				const def = itemColorSupplier.cache.get(item.id());
				// removing a group can't impact items that have no group
				return def != null && def.index >= index;
			});
			// maintain consistency with group order
			for (const def of itemColorSupplier.cache.values()) {
				if (def.index >= index) {
					def.index -= 1;
				}
			}
		},
	}}
	bind:this={timelineView}
	on:select={(e) => openFile(e.detail.causedBy, e.detail.item)}
	on:focus={(e) =>
		dispatch("noteFocused", itemsById.get(e.detail.id())?.note)}
	on:create={(e) => createItem(e.detail)}
	onMoveItem={moveItem}
	onItemsResized={resizeItems}
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
	<!-- @migration-task: migrate this slot by hand, `additional-settings` is an invalid identifier -->
	<svelte:fragment slot="additional-settings">
		{#if propertySelector}
			<TimelinePropertySection
				collapsed={settings
					.namespace("property")
					.make("collapsed", true)}
				selector={propertySelector}
				on:propertySelected={(event) =>
					onPropertySelected(event.detail)}
				on:secondaryPropertySelected={({ detail }) =>
					onSecondaryPropertySelected(detail)}
				on:secondaryPropertyToggled={({ detail: inUse }) => {
					for (const item of itemsById.values()) {
						item.lengthSelector = lengthOf;
					}
					timelineView!.refresh();
				}}
				on:secondaryPropertyReinterpreted={({
					detail: interpretation,
				}) => {
					$secondaryPropertyInterpretedAs = interpretation;
					for (const item of itemsById.values()) {
						item.lengthSelector = lengthOf;
					}
					timelineView!.refresh();
				}}
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
