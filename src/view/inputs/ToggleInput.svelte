<script lang="ts">
	import ObsidianCheckbox from "src/obsidian/view/ObsidianCheckbox.svelte";

	export let name: string;
	export let tabindex: number;
	export let checked: boolean = false;
	let className: string = "";
	export { className as class };
	export let disabled: boolean = false;
	export let hint: string = "";

	export let mod: "mod-small" | undefined = undefined;
</script>

<!-- svelte-ignore a11y-label-has-associated-control  `ObsidianCheckbox` is a control -->
<label aria-label={hint} class={className} aria-disabled={disabled}>
	{name}
	<ObsidianCheckbox class={mod} bind:checked {tabindex} {disabled} />
</label>
