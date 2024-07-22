<script lang="ts">
	let className: string = "";
	export { className as class };
	export let checked: boolean = false;
	export let tabindex: number = 0;
	export let disabled: boolean = false;

	let wasChecked = checked;
	$: if (wasChecked !== checked) {
		if (!disabled) {
			checked = wasChecked;
		}
	}
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
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
