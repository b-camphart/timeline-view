<!-- @migration-task Error while migrating Svelte code: Cannot overwrite a zero-length range – use appendLeft or prependRight instead -->
<!-- 
@component
provides a way of creating a checkbos that matches the checkbox used in 
Obsidiann 
-->
<script lang="ts">
	interface Props {
		class?: string;
		checked?: boolean;
		tabindex?: number;
		disabled?: boolean;
	}

	let { class: className = "", checked = $bindable(false), tabindex = 0, disabled = false }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="checkbox-container {checked ? 'is-enabled' : ''} {className}" class:disabled {tabindex}>
	<input type="checkbox" tabindex="0" bind:checked {disabled} />
</div>

<style>
	.checkbox-container.disabled {
		opacity: 0.5;
	}
</style>
