<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

    interface $$Props extends HTMLAttributes<HTMLDivElement> {}
</script>

<div {...$$restProps} class="row{$$restProps.class ? ` ${$$restProps.class}` : ""}" >
    <slot></slot>
</div>

<style>
    .row {
        display: flex;
        flex-direction: column;
    }
</style>