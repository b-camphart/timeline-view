<script lang="ts">
	import { quintOut } from "svelte/easing";
	import SvgIcon from "./SvgIcon.svelte";
    import { slide } from "svelte/transition"
	import ActionButton from "./inputs/ActionButton.svelte";

    export let name: string;
    let className: string = "";
    export { className as class }
	export let tabindex: number = 0;
    export let collapsed = true;

	function toggleCollapse() {
		collapsed = !collapsed;
	}

	const id = "collapsable_section_" + Math.random().toString(36).slice(2)
</script>

<fieldset class="collapsable{collapsed ? ' collapsed' : ''} {className}">
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<header on:mousedown|self={toggleCollapse}>
		<ActionButton on:action={toggleCollapse} {tabindex} {id}>
			<SvgIcon>
				<path d="M3 8L12 17L21 8" />
			</SvgIcon>
		</ActionButton>
		<legend><label for={id}>{name}</label></legend>
	</header>
	{#if !collapsed}
		<main transition:slide={{ delay: 0, duration: 200, easing: quintOut, axis: "y" }}>
			<slot />
		</main>
	{/if}
</fieldset>

<style>
	fieldset.collapsable :global(.svg-icon) {
        transition: transform 100ms ease-in-out;
    }
	fieldset.collapsable.collapsed :global(.svg-icon) {
		transform: rotate(-90deg);
        transition: transform 100ms ease-in-out;
	}
</style>
