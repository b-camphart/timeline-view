<script lang="ts">
	import CollapsableSection from "src/view/CollapsableSection.svelte";
	import ActionButton from "../../../../view/inputs/ActionButton.svelte";
	import GroupForm from "./GroupForm.svelte";
	import type { NamespacedWritableFactory } from "src/timeline/Persistence";
	import type { TimelineGroupsSettingViewModel } from './viewModel'
	import type { TimelineItemGroups } from "./Groups";
	import type { ItemGroup } from "./FileGroup";

	export let timelineItemGroups: TimelineItemGroups;

	export let name: string;
	export let viewModel: NamespacedWritableFactory<TimelineGroupsSettingViewModel>;

	const collapsed = viewModel.make('collapsed', true);
	const groupById = new Map<string, ItemGroup>();
	let groups = [...timelineItemGroups.listGroups()];
	groups.forEach(group => groupById.set(group.id, group))

	export function addGroup(group: ItemGroup) {
		groupById.set(group.id, group)
		groups.push(group)
		groups = groups;
	}

	export function recolorGroup(group: ItemGroup) {
		groupById.set(group.id, group)
		groups = groups.map(({id}) => groupById.get(id)!)
	}

	export function changeGroupQuery(group: ItemGroup) {
		groupById.set(group.id, group)
		groups = groups.map(({id}) => groupById.get(id)!)
	}

	export function removeGroup(groupId: string) {
		groupById.delete(groupId)
		groups = groups.filter(({id}) => id !== groupId).map(({id}) => groupById.get(id)!)
	}

	export function newOrder(newGroups: readonly ItemGroup[]) {
		groupById.clear()
		newGroups.forEach(group => groupById.set(group.id, group))
		groups = [...newGroups]
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

		timelineItemGroups.reorderGroup(groups[dragIndex].id, dragOverIndex)

        // storedGroups.update(storedGroups => {
        //     const [group] = storedGroups.splice(dragIndex, 1)
        //     storedGroups.splice(dragOverIndex, 0, group)

        //     fileColorCache.clear()
        //     return storedGroups

        // })

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
            {#each groups.filter((_, index) => index !== dragIndex) as group, index (index)}
                <GroupForm
                    {group}
                    pushDown={dragOverIndex >= 0 && index >= dragOverIndex}
                />
            {/each}
        {:else}
            {#each groups as group, index}
                <GroupForm
                    {group}
					groups={timelineItemGroups}
                    on:remove={() => timelineItemGroups.removeGroup(group.id)}
                    on:primeDrag={({ detail }) => primeDrag(index, detail)}
                    bind:clientWidth={groupFormWidth}
                    bind:clientHeight={groupFormHeight}
                    bind:innerHeight={groupFormInnerHeight}
                />
            {/each}
        {/if}
	</div>
	<div class="graph-color-button-container">
		<ActionButton class="mod-cta" on:action={() => timelineItemGroups.createNewGroup()}
			>New group</ActionButton
		>
	</div>
</CollapsableSection>
{#if dragIndex >= 0}
    <dialog open style="top: {dragImgPos.top}px;left:{dragImgPos.left}px;" bind:this={dragDialog}>
        <GroupForm
            group={groups[dragIndex]}
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
