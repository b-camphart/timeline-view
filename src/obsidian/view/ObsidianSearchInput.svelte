<script lang="ts">
	interface Props {
		value: string;
		isLoading?: true;
		[key: string]: any;
	}

	let { value = $bindable(), isLoading, ...rest }: Props = $props();
	function clearSearch() {
		value = "";
	}
</script>

<div class:is-loading={isLoading} aria-busy={isLoading}>
	<div class="search-input-container">
		<input
			type="search"
			enterkeyhint="search"
			spellcheck="false"
			bind:value
			{...rest}
		/>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="search-input-clear-button"
			aria-label="Clear search"
			onclick={clearSearch}
			onkeydown={(e) => e.key === "Enter" && clearSearch()}
		></div>
	</div>
</div>

<style>
	div:not(.search-input-container):not(.search-input-clear-button) {
		padding: var(--size-2-3) 0;
	}
</style>
