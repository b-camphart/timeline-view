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
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	class="checkbox-container {checked ? 'is-enabled' : ''} {className}"
	class:disabled
	{tabindex}
>
	<input
		type="checkbox"
		tabindex="0"
		bind:checked={() => checked,
		(value) => {
			if (!disabled) {
				checked = value;
			}
		}}
		{disabled}
	/>
</div>

<style>
	.checkbox-container.disabled {
		opacity: 0.5;
	}
</style>
