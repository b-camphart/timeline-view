<script lang="ts">
	import { quintOut } from "svelte/easing";
	import { slide } from "svelte/transition";
	import ActionButton from "./inputs/ActionButton.svelte";
	import LucideIcon from "src/obsidian/view/LucideIcon.svelte";

	
	interface Props {
		name: string;
		class?: string;
		tabindex?: number;
		collapsed?: boolean;
		children?: import('svelte').Snippet;
	}

	let {
		name,
		class: className = "",
		tabindex = 0,
		collapsed = $bindable(true),
		children
	}: Props = $props();

	function toggleCollapse() {
		collapsed = !collapsed;
	}
</script>

<section class="collapsable{collapsed ? ' collapsed' : ''} {className}">
	<ActionButton
		on:action={toggleCollapse}
		{tabindex}
		class="header clickable-icon collapse-icon {collapsed
			? 'is-collapsed'
			: ''}"
	>
		<LucideIcon id="right-triangle" />
		{name}
	</ActionButton>
	{#if !collapsed}
		<div
			class="content"
			transition:slide={{
				delay: 0,
				duration: 200,
				easing: quintOut,
				axis: "y",
			}}
		>
			{@render children?.()}
		</div>
	{/if}
</section>

<style>
	.collapsable :global(.header) {
		margin-bottom: var(--size-2-1);
	}
	/* .collapsable header {
		align-items: baseline;
		display: flex;
		border-radius: var(--radius-s);
		color: var(--nav-item-color);
		font-size: var(--nav-item-size);
		line-height: var(--line-height-tight);
		font-weight: var(--nav-item-weight);
		margin-bottom: var(--size-2-1);
		position: relative;
		padding: var(--nav-item-parent-padding);
		padding-left: var(--size-4-4);
	}

	.collapsable header label {
		font-weight: var(--font-semibold);
		font-size: var(--font-ui-small);
		color: var(--text-normal);
		margin: 0;
	}

	.collapsable header :global(button) {
		position: absolute;
		margin-left: calc(-1 * var(--size-4-5));
		width: var(--size-4-4);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: var(--icon-opacity);
		color: var(--icon-color);
		flex: 0 0 auto;
		padding: 0;
		background-color: transparent;
		border: none;
	}

	fieldset header :global(button) :global(.svg-icon) {
		color: var(--nav-collapse-icon-color);
		stroke-width: 4px;
		width: 10px;
		height: 10px;
	}

	fieldset header :global(button:hover) {
		content: "\200b";
	} */
</style>
