<!-- 
@component
provides a way of creating a checkbos that matches the checkbox used in 
Obsidiann 
-->
<script lang="ts">
	let {
		class: className = "",
		tabindex = 0,
		disabled = false,
		checked = $bindable(false),
	}: {
		class?: string;
		tabindex?: number;
		disabled?: boolean;
		checked?: boolean;
	} = $props();

	let wasChecked = $state(checked);
	$effect(() => {
		if (wasChecked !== checked) {
			if (!disabled) {
				checked = wasChecked;
			}
		}
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="checkbox-container {checked ? 'is-enabled' : ''} {className}"
	class:disabled
	{tabindex}
>
	<input type="checkbox" tabindex="0" bind:checked={wasChecked} {disabled} />
</div>

<style>
	.checkbox-container.disabled {
		opacity: 0.5;
	}
</style>
