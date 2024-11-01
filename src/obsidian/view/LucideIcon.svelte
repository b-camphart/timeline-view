<script lang="ts">
	import obsidian from "obsidian";

	interface Props {
		id: string;
	}

	let { id }: Props = $props();

	let parent: HTMLDivElement | undefined = $state();

	function createIcon(id: string, parent: HTMLDivElement | undefined) {
		if (parent == null) return;
		parent.empty();
		obsidian.setIcon(parent, id);

		const svgElement = parent.firstChild;
		if (svgElement instanceof SVGElement) {
			parent.replaceWith(svgElement);
		}
	}

	$effect(() => {
		createIcon(id, parent);
	});
</script>

{#key id}
	<div bind:this={parent}></div>
{/key}
