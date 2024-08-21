<script lang="ts">
	const allBindings = {
		pan: [
			"Scroll",
			"Home",
			"End",
			"Page Up",
			"Page Down",
			"Arrow Up",
			"Arrow Down",
		],
		"pan horizontal": ["Shift + Scroll", "Arrow Left", "Arrow Right"],
		zoom: ["Ctrl + Scroll"],
		"zoom to fit": ["Shift + Space"],
		"focus on item": ["Right Click"],
		"focus on next item": ["Tab"],
		"focus on previous item": ["Shift + Tab"],
		"move items in selection": ["Click + Drag"],
		"extend selection": ["Ctrl + Click"],
		"create new item": ["Double Click"],
	};
</script>

<div class="timeline-help">
	{#each Object.entries(allBindings) as [key, bindings]}
		<div class="instruction">
			<div class="instruction-label">
				{key[0].toLocaleUpperCase()}{key.slice(1)}
			</div>
			<div class="instruction-desc">
				{#each bindings as binding}
					<span class="setting-hotkey">{binding}</span>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.timeline-help {
		display: flex;
		flex-direction: column;
		gap: var(--size-4-3);
	}
	.timeline-help .instruction {
		display: flex;
		justify-content: space-between;
	}

	.timeline-help .instruction-desc {
		display: flex;
		gap: var(--size-4-1);
	}
</style>
