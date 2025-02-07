<script lang="ts" module>
	import GroupListItem, {
		Group as TimelineGroup,
	} from "src/timeline/group/GroupListItem.svelte";

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

	export class Groups {
		#groups = $state<TimelineGroup[]>([]);
		list(): readonly TimelineGroup[] {
			return this.#groups;
		}
		appendNewGroup() {
			this.#groups.push(
				new TimelineGroup(
					"",
					defaultGroupColors[
						this.#groups.length % defaultGroupColors.length
					],
				),
			);
		}

		reorder(from: number, to: number) {
			if (from === to) return null;
			const removed = this.#groups.splice(from, 1);
			this.#groups.splice(to, 0, removed[0]);
			return removed[0];
		}

		removeIndex(index: number) {
			if (index < 0 || index >= this.#groups.length) {
				return;
			}
			this.#groups.splice(index, 1);
		}

		constructor(groups: readonly TimelineGroup[]) {
			this.#groups = groups.slice();
		}
	}
</script>

<script lang="ts">
	import CtaButton from "src/obsidian/view/CTAButton.svelte";
	import Portal from "src/view/Portal.svelte";

	interface Props {
		groups: Groups;
	}

	let { groups }: Props = $props();

	let drag: null | {
		index: number;
		overIndex: number;
		imgPos: { top: number; left: number; width: number; height: number };
		offsetHeight: number;
	} = $state(null);

	let groupListElement: HTMLElement | undefined = $state();

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
		if (groupListElement === undefined) return;
		const dragIndex = index;
		const groupHeight = start.currentTarget.offsetHeight;
		const groupWidth = start.currentTarget.offsetWidth;

		const offsetHeight =
			groupListElement.clientHeight / groups.list().length;

		function mousemove(event: MouseEvent) {
			if (groupListElement === undefined) return;
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

			try {
				if (drag != null) {
					groups.reorder(
						dragIndex,
						Math.min(groups.list().length - 1, drag.overIndex),
					);
				}
			} finally {
				drag = null;
			}
		}
		window.addEventListener("mousemove", mousemove);
		window.addEventListener("mouseup", endDrag);
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
		{#each groups.list() as group, index}
			<GroupListItem
				{group}
				onRemove={groups.removeIndex.bind(groups, index)}
				onPressDragHandle={(event) => primeDrag(index, event)}
			/>
		{/each}
	{:else}
		{@const dragIndex = drag.index}
		{#each groups
			.list()
			.filter((_, index) => index !== dragIndex) as group, index}
			<GroupListItem
				{group}
				class={drag.overIndex >= 0 && index >= drag.overIndex
					? "displaced"
					: ""}
			/>
		{/each}
	{/if}
</ol>
<div class="graph-color-button-container">
	<CtaButton on:action={() => groups.appendNewGroup()}>New group</CtaButton>
</div>

{#if drag != null}
	<Portal open top="{drag.imgPos.top}px" left="{drag.imgPos.left}px">
		<div>
			<GroupListItem
				group={groups.list()[drag.index]}
				style="width:{drag.imgPos.width}px;height:{drag.imgPos
					.height}px;pointer-events:none;"
			/>
		</div>
	</Portal>
{/if}

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

	:global(dialog) div {
		cursor: grabbing;
	}

	:global(.setting-item-control):has(:global(.group-list)) {
		flex-direction: column;
	}
	.group-list {
		align-self: stretch;
	}
	.graph-color-button-container {
		align-self: end;
	}
</style>
