<script lang="ts">
	import * as obsidian from "obsidian";
	import TimelineView from "../../timeline/Timeline.svelte";
	import type { RulerValueDisplay } from "../../timeline/Timeline";
	import { type NamespacedWritableFactory } from "../../timeline/Persistence";
	import { createEventDispatcher, onMount } from "svelte";
	import { get } from "svelte/store";
	import TimelinePropertySection from "../../timeline/property/TimelinePropertySection.svelte";
	import type { ObsidianNoteTimelineViewModel } from "./viewModel";
	import TimelineFilterSection from "../../timeline/filter/TimelineFilterSection.svelte";
	import type { NotePropertyRepository } from "src/note/property/repository";
	import type { MutableNoteRepository } from "src/note/repository";
	import type { Note } from "src/note";
	import { TimelinePropertySelector } from "src/timeline/property/TimelinePropertySelector";
	import type { TimelineProperty } from "src/timeline/property/TimelineProperty";
	import { TimelineItemQueryFilter } from "src/timeline/filter/TimelineItemQueryFilter";
	import { TimelineGroups } from "src/timeline/group/groups";
	import * as timelineGroup from "src/timeline/group/group";
	import type { TimelineItemColorSupplier } from "src/timeline/item/color";
	import { MutableSortedArray } from "src/utils/collections";

	class ReactiveNoteItem {
		created = $state(0);
		modified = $state(0);
		properties = $state<Record<string, unknown>>({});
		group = $state<null | { color(): string }>(null);

		get id() {
			return this.#note.id();
		}

		#note;
		get note() {
			return this.#note;
		}

		#name = $state("");
		name() {
			return this.#name;
		}

		color() {
			return this.group?.color();
		}

		constructor(note: Note) {
			this.#note = note;
			this.replaceNote(note);
		}

		replaceNote(note: Note) {
			this.#note = note;
			this.#name = note.name();
			this.created = note.created();
			this.modified = note.modified();
			this.properties = note.properties();
		}
	}

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
	}>();

	const settings = viewModel.namespace("settings");

	let itemsById: Map<string, ReactiveNoteItem> = new Map();
	let items: MutableSortedArray<ReactiveNoteItem> = $state.raw(
		new MutableSortedArray(valueOf),
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
				if (await filter.noteFilter().matches(item.note)) {
					newItems.push(item);
				}
			}
			items = new MutableSortedArray(valueOf, ...newItems);
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

	function openFile(event: Event | undefined, item: ReactiveNoteItem) {
		dispatch("noteSelected", { note: item.note, event });
	}

	// @ts-ignore
	let propertySelector: TimelinePropertySelector = $state();
	function propertyValueOf(item: ReactiveNoteItem) {
		const property = propertySelector?.selectedProperty();
		if (!property) return null;
		if (property.isCreatedProperty()) return item.created;
		if (property.isModifiedProperty()) return item.modified;
		const value = item.properties[property.name()];
		if (value == null) return null;
		if (typeof value === "number") return value;
		if (typeof value === "string") {
			const datetime = window.moment(value);
			if (datetime.isValid()) {
				return datetime.valueOf();
			}
			const parsed = parseFloat(value);
			if (!isNaN(parsed)) return parsed;
			return null;
		}
		return null;
	}
	function valueOf(item: ReactiveNoteItem) {
		const value = propertyValueOf(item);
		// todo: some other default?
		return value ?? 0;
	}

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

	async function resizeItems(
		items: {
			item: ReactiveNoteItem;
			value: number;
			length: number;
			endValue: number;
		}[],
	) {
		if (!propertySelector.secondaryPropertyInUse()) return;
		const noteResizes = new Array<{
			note: Note;
			item: ReactiveNoteItem;
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
			const item = itemsById.get(items[i].item.id);
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
			Object.assign(
				noteResizes[i].item.properties,
				noteResizes[i].properties,
			);
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
			const item = new ReactiveNoteItem(note);
			itemsById.set(note.id(), item);
			enqueueItemColorUpdate(item);
		}

		const filteredItems = [];
		for (let item of itemsById.values()) {
			if (await filter.noteFilter().matches(item.note)) {
				filteredItems.push(item);
			}
		}
		items = new MutableSortedArray(valueOf, ...filteredItems);

		if (isNew) {
			timelineView.zoomToFit();
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
		const queue: ReactiveNoteItem[] = [];
		const uniqueQueue = new Set<ReactiveNoteItem>();
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
						itemColorSupplier.cache.delete(item.note.id());
						for (let i = 0; i < groups.length; i++) {
							const group = groups[i];
							if (await group.noteFilter().matches(item.note)) {
								itemColorSupplier.cache.set(item.note.id(), {
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

		return (item: ReactiveNoteItem) => {
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
		predicate: (item: ReactiveNoteItem) => boolean,
	) {
		for (const item of itemsById.values()) {
			if (predicate(item)) {
				enqueueItemColorUpdate(item);
			}
		}
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
		const item = new ReactiveNoteItem(file);
		itemsById.set(file.id(), item);
		if (await filter.noteFilter().matches(item.note)) {
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

		const keep = await filter.noteFilter().matches(file);

		enqueueItemColorUpdate(item);
		enqueueItemUpdate(() => {
			items.remove(item);
			item.replaceNote(file);
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

		const keep = await filter.noteFilter().matches(file);

		enqueueItemColorUpdate(item);
		enqueueItemUpdate(() => {
			items.remove(item);
			item.replaceNote(file);
			if (keep) items.add(item);
		});
	}

	export function focusOnNote(note: Note) {
		const item = itemsById.get(note.id());
		if (item == null) return;
		timelineView?.focusOnId(note.id());
	}

	export function zoomToFit() {
		timelineView?.zoomToFit();
	}

	function onPropertySelected(property: TimelineProperty) {
		propertySelector = propertySelector;
		items = new MutableSortedArray(valueOf, ...items);
		display = property.displayedAs();
		timelineView.zoomToFit();
	}

	function onSecondaryPropertySelected(property: TimelineProperty) {
		timelineView!.refresh();
	}

	function onPreviewNewItemValue(
		item: ReactiveNoteItem,
		value: number,
	): number {
		return propertySelector.selectedProperty().sanitizeValue(value);
	}

	const selectItemValue = $derived.by(() => {
		const property = propertySelector?.selectedProperty();
		if (property == null) {
			return () => null;
		}
		if (property.isCreatedProperty()) {
			return (item: ReactiveNoteItem) => item.note.created();
		}
		if (property.isModifiedProperty()) {
			return (item: ReactiveNoteItem) => item.note.modified();
		}
		return (item: ReactiveNoteItem) => {
			const value = item.properties[property.name()];
			if (value == null) return null;
			if (typeof value === "number") return value;
			if (typeof value === "string") {
				const datetime = window.moment(value);
				if (datetime.isValid()) {
					return datetime.valueOf();
				}
				const parsed = parseFloat(value);
				if (!isNaN(parsed)) return parsed;
				return null;
			}
			return null;
		};
	});

	const selectValue = $derived.by(() => {
		const valueOf = selectItemValue;
		return (item: ReactiveNoteItem) => valueOf(item) ?? 0;
	});
</script>

<TimelineView
	items={Array.from(items)}
	{selectValue}
	selectLength={!propertySelector?.secondaryPropertyInUse()
		? () => 0
		: (item) => lengthOf(item.note)}
	previewItem={(name, value, length, endValue) => {
		return summarizeItem(name, value, length, endValue);
	}}
	summarizeItem={(item) => summarizeNote(item.note)}
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
				const def = itemColorSupplier.cache.get(item.note.id());
				// a new query could impact items that have no group, but not
				// items that have a group of a higher priority
				return def == null || def.index >= index;
			});
		},
		onGroupsReordered(from, to, _group, _groups) {
			const minAffectedIndex = Math.min(from, to);
			enqueueItemRecolorMatching((item) => {
				const def = itemColorSupplier.cache.get(item.note.id());
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
				const def = itemColorSupplier.cache.get(item.note.id());
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
	onSelected={(item, cause) => openFile(cause, item)}
	onFocused={(item) => dispatch("noteFocused", item.note)}
	onCreate={(value) => createItem({ value })}
	onItemsResized={resizeItems}
	{onPreviewNewItemValue}
	oncontextmenu={(e, triggerItems) => {
		oncontextmenu(
			e,
			triggerItems.map((it) => it.note),
		);
	}}
	openDialog={openModal}
>
	{#snippet additionalSettings()}
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
						item;
					}
					timelineView!.refresh();
				}}
				on:secondaryPropertyReinterpreted={({
					detail: interpretation,
				}) => {
					$secondaryPropertyInterpretedAs = interpretation;
				}}
			/>
		{/if}
		<TimelineFilterSection
			collapsed={settings.namespace("filter").make("collapsed", true)}
			{filter}
		/>
	{/snippet}
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
