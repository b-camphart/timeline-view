<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		selected: boolean;
		tabindex: number;
		icon?: Snippet;
		children?: Snippet;
	}

	let { selected, tabindex, icon, children, ...divProps }: Props = $props();
</script>

<div
	class="suggestion-item mod-complex"
	class:is-selected={selected}
	aria-selected={selected}
	role="option"
	{tabindex}
	{...divProps}
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
