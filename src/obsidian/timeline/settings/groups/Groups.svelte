<script lang="ts">
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import ActionButton from "../../../../view/inputs/ActionButton.svelte";
	import {
		getColorSelector,
		type ColorSelector,
		type ItemGroup,
	} from "./FileGroup";
	import GroupForm from "./GroupForm.svelte";
	import type { NamespacedWritableFactory } from "src/timeline/Persistence";
	import { persistedGroupSection } from "./persistence";
	import { writable } from "svelte/store";
	import { groupFilter } from "./grouping";
	import { createEventDispatcher } from "svelte";

	const defaultGroupColors = [
		"#e05252",
		"#e0b152",
		"#b1e052",
		"#52e052",
		"#52e0b1",
		"#52b1e0",
		"#5252e0",
		"#b152e0",
		"#e052b1",
	];

	const dispatch = createEventDispatcher<{ invalidated: null }>();

	export let name: string;
	export let namespace: NamespacedWritableFactory;

	const section = persistedGroupSection(namespace);
	const collapsed = section.collapsed;
	const storedGroups = section.groups;

	function completeItemGroups(partialGroups: Omit<ItemGroup, "filter">[]) {
		return partialGroups.map((group) => {
			let query = group.query;
			let filter = groupFilter(group.query);
			return {
				get query() {
					return query;
				},
				set query(newQuery) {
					query = newQuery;
					filter = groupFilter(group.query);
				},
				get filter() {
					return filter;
				},
				color: group.color,
			} satisfies ItemGroup;
		});
	}

	const groups = writable(completeItemGroups($storedGroups));
	storedGroups.subscribe((storedGroups) => {
		groups.set(completeItemGroups(storedGroups));
		dispatch("invalidated");
	});

	const fileColorCache = new Map<string, string | undefined>();
	$: selector = getColorSelector($groups);
	export const colorSelection: ColorSelector = {
		selectColor(file) {
			let color: string | undefined;
			if (fileColorCache.has(file.path)) {
				color = fileColorCache.get(file.path);
			} else {
				color = selector.selectColor(file);
			}
			fileColorCache.set(file.path, color);
			return color;
		},
		invalidate(path) {
			fileColorCache.delete(path);
		},
	};

	function addGroup() {
		const color =
			defaultGroupColors[
				$storedGroups.length % defaultGroupColors.length
			];

		const storedGroup = {
			query: "",
			color,
		};

		storedGroups.update((storedGroups) => {
			fileColorCache.clear();
			storedGroups.push(storedGroup);
			return storedGroups;
		});
	}

	function groupChanged() {
		storedGroups.update((storedGroups) => {
			fileColorCache.clear();
			return storedGroups;
		});
	}

	function removeGroup(index: number) {
		storedGroups.update((storedGroups) => {
			fileColorCache.clear();
			storedGroups.splice(index, 1);
			return storedGroups;
		});
	}

	let groupFormWidth = 0;
	let groupFormHeight = 0;
	let groupFormInnerHeight = 0;
    let primedDragIndex = -1
	let dragIndex = -1;
    let dragOverIndex = -1;

    let dragHandle: { offsetX: number, offsetY: number } = { offsetX: 0, offsetY: 0 }
    let dragImgPos = { top: 0, left: 0 };
    function primeDrag(index: number, position: { offsetX: number, offsetY: number }) {
		primedDragIndex = index;
        dragHandle = position
        dragImgPos = { left: position.offsetX, top: position.offsetY }

        window.addEventListener("mousemove", mousemove)
        window.addEventListener("mouseup", endDrag)
	}
    function mousemove(event: MouseEvent) {
        dragIndex = primedDragIndex;
        dragImgPos = { top: event.pageY - dragHandle.offsetY, left: event.pageX - dragHandle.offsetX }
    }
	function endDrag() {
        window.removeEventListener("mousemove", mousemove)
        window.removeEventListener("mouseup", endDrag)

        storedGroups.update(storedGroups => {
            const [group] = storedGroups.splice(dragIndex, 1)
            storedGroups.splice(dragOverIndex, 0, group)

            fileColorCache.clear()
            return storedGroups

        })

		dragIndex = -1;
        dragOverIndex = -1;
	}

	function relativeMouseMove(event: MouseEvent & { currentTarget: HTMLDivElement }) {
        if (dragIndex < 0) return;
		const currentTargetY =
			event.pageY - event.currentTarget.getBoundingClientRect().top;
		dragOverIndex = Math.floor(currentTargetY / groupFormHeight);
	}

    let dragDialog: HTMLDialogElement | undefined;
    $: if (dragDialog != null) {
        if (dragDialog.parentElement != dragDialog.ownerDocument.body) {
            dragDialog.ownerDocument?.body?.appendChild(dragDialog)
        }
    }
</script>

<CollapsableSection {name} bind:collapsed={$collapsed}>
	<div
		class="group-list"
		on:mousemove={relativeMouseMove}
		role="list"
		class:dragging={dragIndex >= 0}
		style="--form-height: {groupFormHeight}px;"
	>
        {#if dragIndex >= 0}
            {#each $storedGroups.filter((_, index) => index !== dragIndex) as group, index (index)}
                <GroupForm
                    {group}
                    pushDown={dragOverIndex >= 0 && index >= dragOverIndex}
                />
            {/each}
        {:else}
            {#each $storedGroups as group, index}
                <GroupForm
                    {group}
                    on:change={groupChanged}
                    on:remove={() => removeGroup(index)}
                    on:primeDrag={({ detail }) => primeDrag(index, detail)}
                    bind:clientWidth={groupFormWidth}
                    bind:clientHeight={groupFormHeight}
                    bind:innerHeight={groupFormInnerHeight}
                />
            {/each}
        {/if}
	</div>
	<div class="graph-color-button-container">
		<ActionButton class="mod-cta" on:action={addGroup}
			>New group</ActionButton
		>
	</div>
</CollapsableSection>
{#if dragIndex >= 0}
    <dialog open style="top: {dragImgPos.top}px;left:{dragImgPos.left}px;" bind:this={dragDialog}>
        <GroupForm
            group={$storedGroups[dragIndex]}
        />
    </dialog>
{/if}

<style>
	.group-list {
		position: relative;
        padding: var(--size-4-1) 0;
	}
    .group-list.dragging {
        padding-bottom: var(--form-height);
    }
	.graph-color-button-container > :global(button) {
		margin-top: var(--size-2-3);
		border-radius: var(--button-radius) !important;
	}

    dialog {
        pointer-events: none;
        padding: 0;
        border: none;
        margin: unset;
        background: none;
    }
</style>
