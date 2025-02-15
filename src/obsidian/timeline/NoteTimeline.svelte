<script lang="ts">
	import * as obsidian from "obsidian";
	import TimelineView from "../../timeline/Timeline.svelte";
	import type { RulerValueDisplay } from "../../timeline/Timeline";
	import { type NamespacedWritableFactory } from "../../timeline/Persistence";
	import { createEventDispatcher, onMount, tick, untrack } from "svelte";
	import { get } from "svelte/store";
	import TimelinePropertySection from "../../timeline/property/TimelinePropertySection.svelte";
	import type { ObsidianNoteTimelineViewModel } from "./viewModel";
	import TimelineFilterSection from "../../timeline/filter/TimelineFilterSection.svelte";
	import type { NotePropertyRepository } from "src/note/property/repository";
	import type { MutableNoteRepository } from "src/note/repository";
	import type { Note } from "src/note";
	import { TimelineItemQueryFilter } from "src/timeline/filter/TimelineItemQueryFilter";
	import { MutableSortedArray } from "src/utils/collections";
	import type { Reactive } from "src/svelte/reactive";
	import { Groups as TimelineGroups } from "src/timeline/group/TimelineGroupsList.svelte";
	import { Group } from "src/timeline/group/GroupListItem.svelte";
	import { TaskQueue } from "src/utils/tasks";
	import { NotePropertyTypes } from "src/timeline/sorting/TimelineNoteSorterProperty";
	import {
		TimelineProperty,
		TimelineProperties,
	} from "src/timeline/property/Property.svelte";

	class ReactiveNoteItem {
		created = $state(0);
		modified = $state(0);
		properties = $state<Record<string, unknown>>({});
		group = $state<null | { color: Reactive<string> }>(null);

		get id() {
			return this.#note.id();
		}

		#note = $state<Note>(null as any);
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
			details: {
				created?: number;
				modified?: number;
				properties?: Record<string, number>;
			};
			event?: Event;
		};
	}>();

	const settings = viewModel.namespace("settings");

	let itemsById: Map<string, ReactiveNoteItem> = new Map();
	let items: MutableSortedArray<ReactiveNoteItem> = $state.raw(
		MutableSortedArray.of(valueOf),
	);

	let currentFilteringId = 0;
	const filterQuery = settings.namespace("filter").make("query", "");
	let filtering = $state(false);
	let filter = new TimelineItemQueryFilter(
		noteRepository,
		$filterQuery,
		async (query) => {
			filterQuery.set(query);

			const filteringId = currentFilteringId + 1;
			currentFilteringId = filteringId;

			const newItems: ReactiveNoteItem[] = [];
			const tasks = TaskQueue.new();

			filtering = true;

			for (const item of itemsById.values()) {
				tasks.enqueue(async () => {
					if (await filter.noteFilter().matches(item.note)) {
						newItems.push(item);
					}
				});
			}

			tasks.onProgress(() => {
				if (currentFilteringId !== filteringId) {
					tasks.cancel();
					return;
				}
				items = MutableSortedArray.of(valueOf, ...newItems);
			});

			tasks.onFinished((cancelled) => {
				if (cancelled) return;
				filtering = false;
			});
		},
	);

	const savedGroups = settings.namespace("groups").make("groups", []);

	const timelineGroups = new TimelineGroups(
		get(savedGroups).map(Group.fromSavedState),
	);
	$effect(() => {
		$savedGroups = timelineGroups.saveState();
	});

	function openFile(event: Event | undefined, item: ReactiveNoteItem) {
		dispatch("noteSelected", { note: item.note, event });
	}

	const propertySettings = settings.namespace("property");
	let properties = $state<null | TimelineProperties>(null);
	onMount(async () => {
		properties = await TimelineProperties.make(
			notePropertyRepository.listPropertiesOfTypes.bind(
				notePropertyRepository,
				NotePropertyTypes,
			),
			get(propertySettings.make("property", "created")),
			get(propertySettings.make("propertiesUseWholeNumbers", {})),
			{
				name: get(
					propertySettings
						.namespace("secondaryProperty")
						.make("name", "modified"),
				),
				useAs: get(
					propertySettings
						.namespace("secondaryProperty")
						.make("useAs", "end"),
				),
				inUse: get(
					propertySettings
						.namespace("secondaryProperty")
						.make("inUse", false),
				),
			},
		);
	});
	$effect(() => {
		if (properties === null) return;
		const saveState = properties.saveState();
		propertySettings.make("property", "created").set(saveState.property);
		propertySettings
			.make("propertiesUseWholeNumbers", {})
			.set(saveState.propertiesUseWholeNumbers);
		const secondaryProp = propertySettings.namespace("secondaryProperty");
		secondaryProp
			.make("name", "modified")
			.set(saveState.secondaryProperty.name);
		secondaryProp
			.make("inUse", false)
			.set(saveState.secondaryProperty.inUse);
		secondaryProp
			.make("useAs", "end")
			.set(saveState.secondaryProperty.useAs);
	});

	const propertyValueOf = $derived.by(() => {
		if (properties === null) return () => 0;
		const property = properties.primary();
		return (item: ReactiveNoteItem) => property.valueOrNull(item);
	});
	function valueOf(item: ReactiveNoteItem) {
		const value = propertyValueOf(item);
		// todo: some other default?
		return value ?? 0;
	}

	async function createItem(item: { value: number }, cause: Event) {
		if (properties === null) return;
		dispatch("createNote", {
			details: properties.createItem(item.value),
			event: cause,
		});
	}

	async function resizeItems(
		items: {
			item: ReactiveNoteItem;
			value: number;
			length: number;
			endValue: number;
		}[],
	) {
		if (properties === null) return;
		const primary = properties.primary();
		const secondary = properties.secondary();
		if (secondary === null) return;
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
			if (property === TimelineProperty.Created) {
				modification.created = value;
			} else if (property === TimelineProperty.Modified) {
				modification.modified = value;
			} else {
				modification.properties[property.name] = value;
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

			setValue(modification, primary, value);
			if (secondary.interpretedAs() === "end") {
				setValue(modification, secondary.property(), endValue);
			} else {
				setValue(modification, secondary.property(), length);
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

	let timelineView: ReturnType<typeof TimelineView> | undefined = $state();
	const display: RulerValueDisplay = $derived(
		(properties?.primary() ?? TimelineProperty.Created).displayedAs(),
	);
	onMount(async () => {
		for (const note of noteRepository.listAll()) {
			const item = new ReactiveNoteItem(note);
			itemsById.set(note.id(), item);
		}

		const filteredItems = [];
		for (let item of itemsById.values()) {
			if (await filter.noteFilter().matches(item.note)) {
				filteredItems.push(item);
			}
		}
		items = MutableSortedArray.of(valueOf, ...filteredItems);

		if (isNew) {
			tick().then(() => {
				timelineView?.zoomToFit();
			});
		}
	});

	const enqueueItemUpdate = (() => {
		const tasks = TaskQueue.new();

		tasks.onProgress(() => {
			items = untrack(() => items.clone());
		});

		return (update: () => void) => {
			tasks.enqueue(update);
		};
	})();

	// const itemColorSupplier = {
	// 	cache: new Map<string, { index: number; color: string }>(),
	// 	itemColorForNote(note: Note): string | undefined {
	// 		return this.cache.get(note.id())?.color ?? undefined;
	// 	},
	// };
	// itemColorSupplier satisfies TimelineItemColorSupplier;

	let itemRecolorQueueLength = $state(0);
	// const enqueueItemColorUpdate = (() => {
	// 	const queue: ReactiveNoteItem[] = [];
	// 	const uniqueQueue = new Set<ReactiveNoteItem>();
	// 	let timer: null | ReturnType<typeof setTimeout> = null;
	// 	let tasks: Promise<void>[] = [];

	// 	async function processBatch() {
	// 		timer = null;

	// 		const start = performance.now();
	// 		if (tasks.length > 0) {
	// 			await Promise.all(tasks);
	// 		}
	// 		tasks = [];

	// 		while (
	// 			queue.length > 0 &&
	// 			performance.now() - start < 16 /* 1/60 */
	// 		) {
	// 			const item = queue.shift()!;
	// 			uniqueQueue.delete(item);
	// 			const groups = timelineGroups.list();
	// 			tasks.push(
	// 				(async () => {
	// 					// itemColorSupplier.cache.delete(item.note.id());
	// 					for (let i = 0; i < groups.length; i++) {
	// 						const group = groups[i];
	// 						if (await group.noteFilter().matches(item.note)) {
	// 							item.group = group;
	// 							// itemColorSupplier.cache.set(item.note.id(), {
	// 							// 	color: group.color(),
	// 							// 	index: i,
	// 							// });
	// 							break;
	// 						}
	// 					}
	// 					timelineView?.invalidateColors();
	// 				})(),
	// 			);
	// 		}
	// 		itemRecolorQueueLength = queue.length;

	// 		if (queue.length > 0) {
	// 			timer = setTimeout(processBatch, 0);
	// 		}
	// 	}

	// 	return (item: ReactiveNoteItem) => {
	// 		if (uniqueQueue.has(item)) return;
	// 		uniqueQueue.add(item);
	// 		queue.push(item);
	// 		// itemColorSupplier.cache.delete(item.id());
	// 		itemRecolorQueueLength = queue.length;
	// 		if (timer != null) return;

	// 		timer = setTimeout(processBatch, 0);
	// 	};
	// })();

	$effect(() => {
		const groups = timelineGroups.list();
		if (groups.length === 0) {
			for (const item of items) {
				item.group = null;
			}
			return;
		}
		const filters = groups.map((it) =>
			noteRepository.getExclusiveNoteFilterForQuery(it.query()),
		);
		let tasks: TaskQueue | null = TaskQueue.new();
		for (const item of items) {
			$effect(() => {
				const note = item.note;
				tasks?.enqueue(async () => {
					item.group = null;
					for (let i = 0; i < groups.length; i++) {
						if (groups[i].query() === "") continue;
						if (await filters[i].matches(note)) {
							item.group = groups[i];
							break;
						}
					}
				});
			});
		}

		tasks.onProgress((remaining) => {
			itemRecolorQueueLength = remaining;
		});
		return () => {
			tasks?.cancel();
			tasks = null;
		};
	});

	const itemLength = $derived.by(() => {
		if (properties === null) return () => 0;
		const secondary = properties.secondary();
		if (secondary === null) return () => 0;
		const secondaryProperty = secondary.property();
		if (secondary.interpretedAs() === "length") {
			return (note: ReactiveNoteItem) =>
				secondaryProperty.valueOrNull(note) ?? 0;
		} else {
			const primary = properties.primary();
			return (note: ReactiveNoteItem) => {
				const start = primary.valueOrNull(note) ?? 0;
				const end = secondaryProperty.valueOrNull(note) ?? start;
				return end - start;
			};
		}
	});

	function summarizeNote(note: Note) {
		if (properties === null) return "";
		const primaryProperty = properties.primary();
		const primaryValue = primaryProperty.valueOrNull({
			created: note.created(),
			modified: note.modified(),
			properties: note.properties(),
		});
		const primaryValueStr =
			primaryValue === null ? "" : display.displayValue(primaryValue);

		const secondary = properties.secondary();

		if (secondary === null) {
			return `${note.name()}\n[${primaryProperty.name}: ${primaryValueStr}]`;
		}

		const secondaryProperty = secondary.property();
		const secondaryValue = secondaryProperty.valueOrNull({
			created: note.created(),
			modified: note.modified(),
			properties: note.properties(),
		});

		if (secondary.interpretedAs() === "end") {
			const secondaryValueStr =
				secondaryValue === null
					? ""
					: display.displayValue(secondaryValue);
			const length =
				(secondaryValue ?? primaryValue ?? 0) - (primaryValue ?? 0);
			return (
				`${note.name()}` +
				`\n[${primaryProperty.name}: ${primaryValueStr}] → [${secondaryProperty.name}: ${secondaryValueStr}]` +
				`\nlength: ${display.displayLength(length)}`
			);
		}

		const end = (primaryValue ?? 0) + (secondaryValue ?? primaryValue ?? 0);
		const secondaryValueStr =
			secondaryValue === null
				? ""
				: display.displayLength(secondaryValue);

		return (
			`${note.name()}` +
			`\n[${primaryProperty.name}: ${primaryValueStr}] → ${display.displayValue(end)}` +
			`\n[${secondaryProperty.name}: ${secondaryValueStr}]`
		);
	}

	function summarizeItem(
		name: string,
		value: number,
		length: number,
		endValue: number,
	) {
		if (properties === null) return "";
		const primaryProperty = properties.primary();
		value = primaryProperty.sanitizeValue(value);
		const primaryValueStr = display.displayValue(value);
		const secondary = properties.secondary();
		if (secondary === null) {
			return `${name}\n[${primaryProperty.name}: ${primaryValueStr}]`;
		}

		const secondaryProperty = secondary.property();
		if (secondary.interpretedAs() === "length") {
			length = secondaryProperty.sanitizeValue(length);
			endValue = value + length;
		} else {
			endValue = secondaryProperty.sanitizeValue(endValue);
			length = endValue - value;
		}
		const lengthStr = display.displayLength(length);
		const endValueStr = display.displayValue(endValue);

		if (secondary.interpretedAs() === "end") {
			return `${name}\n[${primaryProperty.name}: ${primaryValueStr}] → [${secondaryProperty.name}: ${endValueStr}]\nlength: ${lengthStr}`;
		}
		return `${name}\n[${primaryProperty.name}: ${primaryValueStr}] → ${endValueStr}\n[${secondaryProperty.name}: ${lengthStr}]`;
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

	$effect(() => {
		if (properties === null) return;
		// update with selected property changes
		properties.primary();
		items = untrack(() => items.clone());
		tick().then(() => {
			timelineView?.zoomToFit();
		});
	});

	// function onPropertySelected(property: TimelineProperty) {
	// 	propertySelector = propertySelector;
	// 	items = new MutableSortedArray(valueOf, ...items);
	// 	display = property.displayedAs();
	// 	tick().then(() => {
	// 		timelineView?.zoomToFit();
	// 	});
	// }

	function onPreviewNewItemValue(
		item: ReactiveNoteItem,
		value: number,
	): number {
		if (properties === null) return value;
		return properties.primary().sanitizeValue(value);
	}

	const selectItemValue = $derived.by(() => {
		if (properties === null) return () => null;
		const primary = properties.primary();
		return primary.valueOrNull.bind(primary);
	});

	const selectValue = $derived.by(() => {
		const valueOf = selectItemValue;
		return (item: ReactiveNoteItem) => valueOf(item) ?? 0;
	});
</script>

<TimelineView
	items={Array.from(items)}
	{selectValue}
	selectLength={itemLength}
	previewItem={(name, value, length, endValue) => {
		return summarizeItem(name, value, length, endValue);
	}}
	summarizeItem={(item) => summarizeNote(item.note)}
	itemsResizable={properties?.secondary() !== null}
	namespacedWritable={viewModel}
	{display}
	groups={timelineGroups}
	pendingGroupUpdates={itemRecolorQueueLength}
	controlBindings={{}}
	bind:this={timelineView}
	onSelected={(item, cause) => openFile(cause, item)}
	onFocused={(item) => dispatch("noteFocused", item.note)}
	onCreate={(value, cause) => createItem({ value }, cause)}
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
		{#if properties !== null}
			<TimelinePropertySection
				collapsed={settings
					.namespace("property")
					.make("collapsed", true)}
				{properties}
			/>
		{/if}
		<TimelineFilterSection
			collapsed={settings.namespace("filter").make("collapsed", true)}
			{filter}
			{filtering}
		/>
	{/snippet}
</TimelineView>

<style>
	@import "../style-settings/settings.css";
	@import "./variables.css";

	:global(body) {
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
