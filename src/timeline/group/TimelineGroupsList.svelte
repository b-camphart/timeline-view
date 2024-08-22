<script lang="ts">
	import GroupListItem from "src/timeline/group/GroupListItem.svelte";
	import CtaButton from "src/obsidian/view/CTAButton.svelte";
	import type { TimelineGroups } from "src/timeline/group/groups";
	import type { TimelineGroup } from "src/timeline/group/group";

	interface $$Props {
		groups: TimelineGroups;
		onGroupAppended?(group: TimelineGroup, groups: TimelineGroups): void;
		onGroupsReordered?(
			from: number,
			to: number,
			group: TimelineGroup,
			groups: TimelineGroups,
		): void;
		onGroupRemoved?(
			index: number,
			group: TimelineGroup,
			groups: TimelineGroups,
		): void;
		onGroupColored?(index: number, group: TimelineGroup): void;
		onGroupQueried?(index: number, group: TimelineGroup): void;
	}

	export let groups: $$Props["groups"];
	export let onGroupAppended: $$Props["onGroupAppended"] = undefined;
	export let onGroupsReordered: $$Props["onGroupsReordered"] = undefined;
	export let onGroupRemoved: $$Props["onGroupRemoved"] = undefined;
	export let onGroupColored: $$Props["onGroupColored"] = undefined;
	export let onGroupQueried: $$Props["onGroupQueried"] = undefined;

	let drag: null | {
		index: number;
		overIndex: number;
		imgPos: { top: number; left: number; width: number; height: number };
		offsetHeight: number;
	} = null;

	let groupListElement: HTMLElement;

	function primeDrag(
		index: number,
		start: {
			readonly currentTarget: HTMLElement;
			readonly offsetX: number;
			readonly offsetY: number;
			readonly clientX: number;
			readonly clientY: number;
		},
	) {
		const dragIndex = index;
		const groupHeight = start.currentTarget.offsetHeight;
		const groupWidth = start.currentTarget.offsetWidth;

		const offsetHeight =
			groupListElement.clientHeight / groups.groups().length;

		function mousemove(event: MouseEvent) {
			drag = {
				index: dragIndex,
				offsetHeight,
				overIndex: Math.max(
					0,
					Math.floor(
						(event.clientY -
							groupListElement.getBoundingClientRect().top) /
							offsetHeight,
					),
				),
				imgPos: {
					top: event.clientY - start.offsetY,
					left: event.clientX - start.offsetX,
					height: groupHeight,
					width: groupWidth,
				},
			};
		}
		function endDrag() {
			window.removeEventListener("mousemove", mousemove);
			window.removeEventListener("mouseup", endDrag);

			if (drag != null) {
				moveGroup(
					dragIndex,
					Math.min(groups.groups().length - 1, drag.overIndex),
				);
			}

			drag = null;
		}
		window.addEventListener("mousemove", mousemove);
		window.addEventListener("mouseup", endDrag);
	}

	let dragDialog: HTMLDialogElement | undefined;
	$: if (dragDialog != null) {
		if (dragDialog.parentElement != dragDialog.ownerDocument.body) {
			dragDialog.ownerDocument?.body?.appendChild(dragDialog);
		}
	}

	function addGroup() {
		const group = groups.appendNewGroup();
		onGroupAppended?.(group, groups);
		groups = groups;
	}

	function moveGroup(from: number, to: number) {
		const group = groups.moveGroup(from, to);
		if (group == null) {
			return;
		}
		onGroupsReordered?.(from, to, group, groups);
		groups = groups;
	}

	function removeGroup(index: number) {
		const group = groups.removeGroup(index);
		console.log("removed group");
		console.log(
			"groups:",
			groups
				.groups()
				.map((it) => ({ query: it.query(), color: it.color() })),
		);
		onGroupRemoved?.(index, group, groups);
		groups = groups;
	}
</script>

<ol
	bind:this={groupListElement}
	class="group-list"
	role="list"
	class:dragging={drag != null}
	style:--form-height={`${drag?.offsetHeight ?? 0}px`}
>
	{#if drag == null}
		{#each groups.groups() as group, index}
			<GroupListItem
				{group}
				onRecolored={(group) => onGroupColored?.(index, group)}
				onRequeried={(group) => onGroupQueried?.(index, group)}
				onRemove={() => removeGroup(index)}
				onPressDragHandle={(event) => primeDrag(index, event)}
			/>
		{/each}
	{:else}
		{@const dragIndex = drag.index}
		{#each groups
			.groups()
			.filter((_, index) => index !== dragIndex) as group, index}
			<GroupListItem
				{group}
				class={drag.overIndex >= 0 && index >= drag.overIndex
					? "displaced"
					: ""}
			/>
		{/each}
		<dialog
			open
			style="top: {drag.imgPos.top}px;left:{drag.imgPos.left}px;"
			bind:this={dragDialog}
		>
			<GroupListItem
				group={groups.groups()[dragIndex]}
				style="width:{drag.imgPos.width}px;height:{drag.imgPos
					.height}px;pointer-events:none;"
			/>
		</dialog>
	{/if}
</ol>
<div class="graph-color-button-container">
	<CtaButton on:action={addGroup}>New group</CtaButton>
</div>

<style>
	ol.group-list {
		list-style-type: none;
		padding-left: 0;
		margin: 0;
	}
	.group-list {
		position: relative;
	}
	.group-list.dragging {
		padding-bottom: var(--form-height);
	}
	.graph-color-button-container > :global(button) {
		margin-top: var(--size-2-3);
		border-radius: var(--button-radius) !important;
	}
	.group-list :global(.timeline-view-color-group) {
		position: relative;
		margin-bottom: 6px;
		transition: top 200ms ease-in-out;
	}
	.group-list :global(.timeline-view-color-group:not(.displaced)) {
		top: 0;
	}
	.group-list :global(.timeline-view-color-group.displaced) {
		top: var(--form-height);
	}

	dialog {
		padding: 0;
		border: none;
		margin: unset;
		background: none;
		z-index: 9999;
		cursor: grabbing;
	}

	:global(.setting-item-control):has(.group-list) {
		flex-direction: column;
	}
	.group-list {
		align-self: stretch;
	}
	.graph-color-button-container {
		align-self: end;
	}
</style>
