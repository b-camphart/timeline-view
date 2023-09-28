<script lang="ts">
    export let text: string;
    export let position: number;
    let className: string = "";
    export { className as class };

</script>

<div class="label {className}" data-value={text} style="left: {position}px;" >
    {text}
</div>


<style>
    .label {
		width: var(--label-width);
        position: absolute;
        top:0;
		transition: width 0.25s, left 0.25s;
	}
</style>