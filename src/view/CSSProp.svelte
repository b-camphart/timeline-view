<script lang="ts">
	let {
		name,
		value = $bindable(),
	}: {
		name: string;
		value: number;
	} = $props();

	const initialValue = value;
</script>

<prop style="width: var({name}, {initialValue}px)" bind:clientWidth={value}
></prop>

<style>
	prop {
		display: block;
		height: 1px;
		position: absolute;
		visibility: hidden;
	}
</style>
