<script lang="ts">
	import ObsidianCheckbox from "src/obsidian/view/ObsidianCheckbox.svelte";

	interface Props {
		name: string;
		tabindex: number;
		checked?: boolean;
		class?: string;
		disabled?: boolean;
		hint?: string;
		mod?: "mod-small" | undefined;
		/** should this label be rendered as a row */
		row?: boolean;
	}

	let {
		name,
		tabindex,
		checked = $bindable(false),
		class: className = "",
		disabled = false,
		hint = "",
		mod = undefined,
		row = false,
	}: Props = $props();
</script>

<!-- svelte-ignore a11y_label_has_associated_control  `ObsidianCheckbox` is a control -->
<label aria-label={hint} class={className} class:row aria-disabled={disabled}>
	{name}
	<ObsidianCheckbox class={mod} bind:checked {tabindex} {disabled} />
</label>

<style>
	label.row {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
</style>
