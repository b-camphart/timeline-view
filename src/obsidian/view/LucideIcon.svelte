<svelte:options accessors={true} />

<script lang="ts">
	import * as obsidian from "obsidian";

	export let id: string;

	let parent: HTMLDivElement | undefined;

	function createIcon(id: string, parent: HTMLDivElement | undefined) {
		if (parent == null) return;
		parent.empty();
		obsidian.setIcon(parent, id);

		const svgElement = parent.firstChild;
		if (svgElement instanceof SVGElement) {
			parent.replaceWith(svgElement);
		}
	}

	$: createIcon(id, parent);
</script>

{#key id}
	<div bind:this={parent}></div>
{/key}
