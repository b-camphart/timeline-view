<script lang="ts">
	export let name: string;
	export let tabIndex: number;
	export let checked: boolean = false;
	let className: string = "";
	export { className as class };
	export let disabled: boolean = false;
	export let hint: string = "";

	const id = "toggle_input_" + Math.random().toString(36).slice(2);

	function toggle() {
		if (disabled) return;
		checked = !checked;
	}
</script>

<div
	aria-disabled={disabled}
	class="toggle-input{checked ? ' checked' : ''} {className}"
>
	<label for={id} aria-label={hint}>{name}</label>
	<div
		role="checkbox"
		tabindex={tabIndex}
		aria-checked={checked}
		aria-disabled={disabled}
		on:click={toggle}
		on:keydown={(e) => (e.key === "Enter" ? toggle() : null)}
	>
		<input {id} type="checkbox" bind:checked {disabled} />
		<div class="thumb"></div>
	</div>
</div>

<style>
	.toggle-input {
		display: flex;
		align-items: center;
		justify-content: space-between;
		--timeline-toggle-thumb-width: 18px;
		--timeline-toggle-thumb-height: 18px;
	}

	.toggle-input input[type="checkbox"] {
		position: absolute;
		opacity: 0;
		left: 0;
	}

	.toggle-input [role="checkbox"] {
		--timeline-toggle-box-width: 32px;
		--timeline-toggle-box-height: 20px;
		display: inline-block;
		flex-shrink: 0;
		height: var(--timeline-toggle-box-height);
		position: relative;
		user-select: none;
		width: var(--timeline-toggle-box-width);
	}

	.toggle-input [role="checkbox"] .thumb {
		pointer-events: none;
		display: block;
		position: absolute;
		width: var(--timeline-toggle-thumb-width);
		height: var(--timeline-toggle-thumb-height);
		transition:
			transform 0.15s ease-in-out,
			width 0.1s ease-in-out,
			left 0.1s ease-in-out;
		left: 0;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
	}

	.toggle-input.checked [role="checkbox"] .thumb {
		transform: translate3d(
			calc(32px - var(--timeline-toggle-thumb-width)),
			0,
			0
		);
	}
</style>
