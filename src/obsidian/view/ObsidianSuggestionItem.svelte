<script lang="ts">
	interface Props {
		selected: boolean;
		tabindex: number;
		icon?: import("svelte").Snippet;
		children?: import("svelte").Snippet;
		onmouseenter?: () => void;
		onfocusin?: () => void;
		onclick?: () => void;
		onkeydown?: (event: KeyboardEvent) => void;
	}

	let {
		selected,
		tabindex,
		icon,
		children,
		onclick,
		onfocusin,
		onkeydown,
		onmouseenter,
	}: Props = $props();
</script>

<div
	class="suggestion-item mod-complex"
	class:is-selected={selected}
	aria-selected={selected}
	role="option"
	{tabindex}
	{onfocusin}
	{onclick}
	{onkeydown}
	{onmouseenter}
>
	<div class="suggestion-icon">
		<span class="suggestion-flair">
			{@render icon?.()}
		</span>
	</div>
	<div class="suggestion-content">
		<div class="suggestion-title">
			{@render children?.()}
		</div>
	</div>
</div>
