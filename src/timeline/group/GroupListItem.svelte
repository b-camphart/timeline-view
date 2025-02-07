<script lang="ts" module>
	export class Group {
		#query = $state("");
		query() {
			return this.#query;
		}
		filterByQuery(query: string) {
			this.#query = query;
		}

		#color = $state("");
		color() {
			return this.#color;
		}
		recolor(color: string) {
			this.#color = color;
		}

		constructor(query: string, color: string) {
			this.#query = query;
			this.#color = color;
		}
	}
</script>

<script lang="ts">
	import GroupColorInput from "src/timeline/group/GroupColorInput.svelte";
	import GroupQueryInput from "src/timeline/group/GroupQueryInput.svelte";
	import ActionButton from "src/view/inputs/ActionButton.svelte";

	interface Props {
		group: Group;
		class?: string;
		style?: string;
		onRemove?: () => void;
		onPressDragHandle?(event: {
			readonly currentTarget: HTMLElement;
			readonly offsetX: number;
			readonly offsetY: number;
			readonly clientX: number;
			readonly clientY: number;
		}): void;
	}

	let {
		group,
		class: className = undefined,
		style = undefined,
		onRemove = undefined,
		onPressDragHandle = undefined,
	}: Props = $props();

	let element: HTMLElement | null = $state(null);

	function onDragHandeMouseDown(
		event: MouseEvent & { currentTarget: HTMLElement },
	) {
		if (onPressDragHandle && element) {
			const currentTarget = element;
			const elementBounds = element.getBoundingClientRect();
			onPressDragHandle({
				get currentTarget() {
					return currentTarget;
				},
				offsetX: event.clientX - elementBounds.x,
				offsetY: event.clientY - elementBounds.y,
				clientX: event.clientX,
				clientY: event.clientY,
			});
		}
	}
</script>

<li
	bind:this={element}
	class="timeline-view-color-group {className ?? ''}"
	{style}
>
	<GroupQueryInput
		bind:query={() => group.query(), (query) => group.filterByQuery(query)}
	/>
	<GroupColorInput
		bind:color={() => group.color(), (color) => group.recolor(color)}
		onmousedown={onPressDragHandle ? onDragHandeMouseDown : undefined}
	/>
	<ActionButton
		class="clickable-icon"
		aria-label="Delete group"
		data-tooltip-position="left"
		on:action={() => onRemove?.()}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="svg-icon lucide-x"
			><line x1="18" y1="6" x2="6" y2="18"></line><line
				x1="6"
				y1="6"
				x2="18"
				y2="18"
			></line></svg
		>
	</ActionButton>
</li>

<style>
	.timeline-view-color-group {
		--swatch-height: 18px;
		--swatch-width: 18px;
		display: flex;
		align-items: center;
		background-color: var(--timeline-settings-background);
	}

	.timeline-view-color-group :global(input[type="text"]) {
		width: 100%;
	}
	.timeline-view-color-group > :global(button) {
		padding: var(--size-2-2) !important;
	}
</style>
