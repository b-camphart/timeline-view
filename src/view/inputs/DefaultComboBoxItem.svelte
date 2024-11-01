<script lang="ts">
    interface Props {
        select: (index: number) => void;
        index: number;
        choice: string;
        hovered: boolean;
    }

    let {
        select,
        index,
        choice,
        hovered
    }: Props = $props();
</script>

<button
    class="{hovered ? "hovered" : ""}"
    onclick={() => select(index)}
    data-index={index}
>
    {choice}
</button>