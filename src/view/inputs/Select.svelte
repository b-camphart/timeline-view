<script lang="ts">
    /// <reference types="vite/client" />
	import { createEventDispatcher } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

    const dispatch = createEventDispatcher<{
        /**
         * Fired just before the select menu is shown
         */
        showing: Event | undefined,
        /**
         * Fired just after the select menu is shown
         */
        shown: Event | undefined,
        /**
         * Fired just before the select menu is hidden
         */
        hiding: Event | undefined,
        /**
         * Fired just after the select menu is hidden
         */
        hidden: Event | undefined
    }>();

    interface $$Props extends HTMLAttributes<HTMLSelectElement> {
        itemCount: number;
    }

    export let itemCount: number = 0;
    let { "aria-disabled": disabled } = $$restProps as $$Props;

    let open = false;
    $: isMenuShown = open;
    export { isMenuShown }

    let button: HTMLButtonElement | undefined;
    let buttonBounds: DOMRect | undefined;

    export function show(causedBy?: Event) {
        if (!disabled && !open && itemCount > 0 && dispatch("showing", causedBy, { cancelable: true })) {
            if (button != null) {
                buttonBounds = button.getBoundingClientRect();
            }
            open = true;
            dispatch("shown", causedBy)
        }
    }

    export function hide(causedBy?: Event) {
        if (!disabled && open && dispatch("hiding", causedBy, { cancelable: true })) {
            open = false;
            dispatch("hidden", causedBy);
        }
    }

    export function toggleShown(causedBy?: Event) {
        if (open) {
            hide(causedBy);
        } else {
            show(causedBy);
        }
    }

    let dialog: HTMLDialogElement | undefined;

    $: if (open && dialog != null) positionDialog(dialog)

    function positionDialog(dialog: HTMLDialogElement) {
        if (dialog.parentElement != document.body) {
			document.body.appendChild(dialog);
        }

        const { width, height } = window.visualViewport!;
        const dialogBounds = dialog.getBoundingClientRect();

        if (buttonBounds != null) {
            dialog.setCssStyles({
                left: `${Math.min(buttonBounds.x, width - dialogBounds.width)}px`,
                top: `${Math.min(
                    buttonBounds.y + buttonBounds.height,
                    height - dialogBounds.height
                )}px`,
                width: buttonBounds.width > dialogBounds.width ? `${buttonBounds.width}px` : undefined,
            });
        } else {
            dialog.setCssStyles({
                left: `${Math.max(0, (width - dialogBounds.width) / 2)}px`,
                top: `${Math.max(0, (height - dialogBounds.height) / 2)}px`
            });
        }
    }

    function onFocusOut(event: FocusEvent) {
        if (dialog == null) {
            return;
        }
        const focusMovedTo = event.relatedTarget
        if (focusMovedTo == null || ! (focusMovedTo instanceof Node) || ! descendsFrom(focusMovedTo, dialog)) {
            hide();
        } else {
            if (button != null) {
                button.focus();
            }
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

</script>

<button 
    {...$$restProps}
    class:select={true}
    aria-disabled={disabled}
    disabled={Boolean(disabled)}
    role="combobox"
    aria-labelledby="select button"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls="select-dropdown"

    bind:this={button}
    
    on:click={toggleShown}
    on:focusout={onFocusOut}
    

>
    <slot name="display"></slot>
</button>
{#if open || import.meta.env.MODE === "development"}
    <dialog {open} class="select-dropdown" bind:this={dialog}>
        <ul role="listbox">
            {#each new Array(itemCount).fill(0) as _, itemIndex}
                <slot name="item" index={itemIndex}></slot>
            {/each}
        </ul>
    </dialog>
{/if}

<style>
    dialog {
        margin: 0;
        border: 0;
    }
    ul {
        margin: 0;
        padding: 0;
    }
</style>