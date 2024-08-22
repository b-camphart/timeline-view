<script lang="ts">
	export let selected: boolean;
	export let tabindex: number;
</script>

<div
	class="suggestion-item mod-complex"
	class:is-selected={selected}
	aria-selected={selected}
	role="option"
	{tabindex}
	on:mouseenter
	on:focusin
	on:click
	on:keydown
>
	<div class="suggestion-icon">
		<span class="suggestion-flair">
			<slot name="icon"></slot>
		</span>
	</div>
	<div class="suggestion-content">
		<div class="suggestion-title">
			<slot></slot>
		</div>
	</div>
</div>
