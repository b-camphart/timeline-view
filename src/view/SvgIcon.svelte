<script lang="ts">
	export let width: number = 24;
	export let height: number = 24;
	let className: string = "";
	export { className as class };
</script>

<svg
	xmlns="http://www.w3.org/2000/svg"
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class="svg-icon {className}"
>
	<slot></slot>
</svg>
