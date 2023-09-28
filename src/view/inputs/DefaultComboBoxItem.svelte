<script lang="ts">
    export let select: (index: number) => void;
    export let index: number;
    export let choice: string;
    export let hovered: boolean;
</script>

<button
    class="{hovered ? "hovered" : ""}"
    on:click={() => select(index)}
    data-index={index}
>
    {choice}
</button>