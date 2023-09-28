<script lang="ts">
    export let style: string | undefined = undefined;
    export let name: string;
    export let displayName: boolean;
    export let tabindex: number;
    export let value: string;
    /**
     * @readonly
     */
    export let measuredWidth: number = 0;

    $: additionalInfo = displayName ? value : `${name}\n${value}`;

</script>


<div
    class="timeline-point"
    {style}
    bind:clientWidth={measuredWidth}
    on:click
    on:keydown
    role="link"
    {tabindex}
    aria-label={additionalInfo}
>
    {#if displayName}
        <div class="display-name">{name}</div>
    {/if}
</div>

<style>
	.timeline-point {
		cursor: pointer;
		position: relative;
		width: var(--point-diameter);
		height: var(--point-diameter);
        margin: var(--margin-between-points);
        margin-left: 0;
        transform: translateX(calc(var(--point-radius) * -1));
		border-radius: 100%;
		transition: left 0.25s, top 0.25s;
        display: flex;
        justify-content: center;
	}

	:global(.timeline-point) .display-name {
		white-space: nowrap;
		position: relative;
		top: calc(
			var(--point-diameter) + calc(var(--margin-between-points) * 2)
		);
		pointer-events: none;
	}
    
</style>