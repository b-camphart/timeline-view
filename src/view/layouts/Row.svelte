<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
    interface Props {
        children?: import('svelte').Snippet;
        [key: string]: any
    }

    let { children, ...rest }: Props = $props();

    
</script>

<div {...rest} class="row{rest.class ? ` ${rest.class}` : ""}" >
    {@render children?.()}
</div>

<style>
    .row {
        display: flex;
        flex-direction: column;
    }
</style>