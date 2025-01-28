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
	}

	let {
		name,
		tabindex,
		checked = $bindable(false),
		class: className = "",
		disabled = false,
		hint = "",
		mod = undefined
	}: Props = $props();
</script>

<!-- svelte-ignore a11y_label_has_associated_control  `ObsidianCheckbox` is a control -->
<label aria-label={hint} class={className} aria-disabled={disabled}>
	{name}
	<ObsidianCheckbox class={mod} bind:checked {tabindex} {disabled} />
</label>
