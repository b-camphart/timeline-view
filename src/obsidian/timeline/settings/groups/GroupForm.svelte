<script lang="ts">
	import { writable } from "svelte/store";

	import ActionButton from "src/view/inputs/ActionButton.svelte";
	import type { ItemGroup } from "./FileGroup";
	import { createEventDispatcher, onMount } from "svelte";
	import type { TimelineItemGroups } from "./Groups";

	export let style: string = "";

	export let group: Omit<ItemGroup, "filter">;
	export let groups: TimelineItemGroups | undefined = undefined;
	export let dragging: boolean = false;
	export let pushDown: boolean = false;
	export let clientWidth: number = 0;
	export let clientHeight: number = 0;
	export let innerWidth: number = 0;
	export let innerHeight: number = 0;

	const dispatch = createEventDispatcher<{
		remove: null;
		primeDrag: { offsetX: number, offsetY: number };
	}>();

	const query = writable(group.query);
	$: query.set(group.query);
	query.subscribe((newQuery) => {
		if (newQuery !== group.query) {
			groups?.applyFileToGroup(group.id, newQuery)
		}
	});

	const color = writable(group.color);
	$: color.set(group.color);
	color.subscribe((newColor) => {
		if (newColor !== group.color) {
			groups?.recolorGroup(group.id, newColor)
		}
	});

	let element: HTMLFieldSetElement;
	onMount(() => {
		if (element == null) return;
		new ResizeObserver(() => {
			if (element == null) return;
			clientWidth = element.clientWidth;
			clientHeight = element.clientHeight;

			innerWidth = element.innerWidth;
			innerHeight = element.innerHeight;
		}).observe(element);
	});

    function primeDrag(event: MouseEvent & { currentTarget: HTMLInputElement }) {
        const offsetX = event.currentTarget.offsetLeft + event.offsetX
        const offsetY = event.currentTarget.offsetTop + event.offsetY 
        dispatch("primeDrag", { offsetX, offsetY })
    }
</script>

<fieldset
	{style}
	bind:this={element}
	class="{dragging ? 'dragging' : ''} {pushDown ? 'pushDown' : ''}"
>
	<input
		type="text"
		spellcheck="false"
		placeholder="Enter query..."
		bind:value={$query}
	/>
	<input
		type="color"
		aria-label={"Click to change color\nDrag to reorder groups"}
		bind:value={$color}
        on:mousedown={primeDrag}
	/>
	<ActionButton
		class="clickable-icon"
		aria-label="Delete group"
		on:action={() => groups?.removeGroup(group.id)}
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
</fieldset>

<style>
	fieldset {
		--swatch-height: 18px;
		--swatch-width: 18px;
		position: relative;
		display: flex;
		align-items: center;
		padding: 0 0 6px 0;
		transition: top 200ms ease-in-out;
	}
	fieldset.pushDown {
		top: var(--form-height);
	}
	input[type="color"] {
		margin: 0 2px 0 6px;
	}
	fieldset > :global(button) {
		padding: var(--size-2-2) !important;
	}
</style>
