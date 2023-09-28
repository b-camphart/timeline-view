<script lang="ts">
	import { createEventDispatcher, tick } from "svelte";
	import { callOnHTMLEvent } from "./ComboBox";
	import DefaultComboBoxItem from "./DefaultComboBoxItem.svelte";

	export let choices: string[];
	export let displayValue: string = "";
	export let placeholder: string | undefined = undefined;

    const dispatch = createEventDispatcher<{ 
        showing: null,
        shown: null,
        closing: null,
        closed: null,
        select: number
    }>()

	let target: HTMLElement | null = null;
	let dialog: HTMLDialogElement | null = null;
	let positionX = -1;
	let positionY = -1;
    let hovered: number = 0;

	$: open = target != null;

	$: if (target != null && dialog != null) {
		if (dialog.parentElement != document.body) {
			document.body.appendChild(dialog);
		}

        positionDialog(dialog, target);
	}
    
    let previousTarget: HTMLElement | undefined;
    $: if (target != null) {
        if (previousTarget != null) {
            previousTarget.removeEventListener("focusout", targetFocusOutListener);
        }
        previousTarget = target;
        target.addEventListener("focusout", targetFocusOutListener)
    }

    const targetFocusOutListener = (event: FocusEvent) => {
        if (dialog == null) {
            return;
        }
        const focusMovedTo = event.relatedTarget
        if (focusMovedTo == null || ! (focusMovedTo instanceof Node) || ! descendsFrom(focusMovedTo, dialog)) {
            close();
        }
    }

    function descendsFrom(potentialDescendant: Node, potentialAnscestor: HTMLElement): boolean {
        let node: Node | null = potentialDescendant;
        while (node != null) {
            if (node == potentialAnscestor) {
                return true;
            }
            node = node.parentElement;
        }
        return false;
    }

    async function positionDialog(dialog: HTMLDialogElement, target: HTMLElement) {
        await tick();

        const targetBounds = target.getBoundingClientRect();
        const { width, height } = window.visualViewport!;
        const dialogBounds = dialog.getBoundingClientRect();

        positionX = Math.min(targetBounds.x, width - dialogBounds.width);
        positionY = Math.min(
            targetBounds.y + targetBounds.height,
            height - dialogBounds.height
        );
    }

	function showOnTarget(element: HTMLElement) {
        if (dispatch("showing")) {
		    target = element;
            dispatch("shown")
        }
	}

	function close() {
        if (dispatch("closing")) {
		    target = null;
            dispatch("closed")
        }
	}

	function select(index: number) {
		close();
		displayValue = choices[index];
        dispatch("select", index);
	}

</script>

<slot name="display" {showOnTarget}>
	<input
		type="text"
		{placeholder}
		on:focusin={callOnHTMLEvent(showOnTarget)}
		bind:value={displayValue}
	/>
</slot>
{#if open || import.meta.env.MODE === "development"}
	<dialog
		class="combo-box-popup"
		{open}
		bind:this={dialog}
		style="left:{positionX}px;top:{positionY}px;"
	>
		<slot name="choices" {select}>
			{#each choices as choice, index}
				<slot name="choice-item" {choice} {select} {index} hovered={hovered==index}>
                    <DefaultComboBoxItem {choice} {select} {index} hovered={hovered==index} />
				</slot>
			{/each}
		</slot>
	</dialog>
{/if}

<style>
    dialog {
        flex-direction: column;
        padding: 0;
        right: unset;
    }
    dialog[open] {
        display: flex;
    }
</style>
