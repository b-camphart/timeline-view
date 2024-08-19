<!-- 
@component
Offsers a select element with a completely customizable dropdown
-->
<script lang="ts">
	import { range } from "src/utils/range";
	import { createEventDispatcher, onDestroy, setContext } from "svelte";
	import type { DOMAttributes, HTMLAttributes } from "svelte/elements";

	const dispatch = createEventDispatcher<{
		/**
		 * Fired just before the select menu is shown
		 */
		showing: Event | undefined;
		/**
		 * Fired just after the select menu is shown
		 */
		shown: Event | undefined;
		/**
		 * Fired just before the select menu is hidden
		 */
		hiding: Event | undefined;
		/**
		 * Fired just after the select menu is hidden
		 */
		hidden: Event | undefined;

		changing: number;

		/**
		 * Fired when the selected index changes.  The selection cannot be
		 * cancelled, but the hiding of the menu can be cancelled.
		 */
		changed: number;
	}>();

	interface $$Props
		extends Exclude<
			HTMLAttributes<HTMLSelectElement>,
			keyof DOMAttributes<HTMLSelectElement>
		> {
		selectedIndex?: number;
		itemCount: number;
	}

	interface $$Slots {
		item: {
			index: number;
		};
	}

	export let selectedIndex: number = -1;
	export let itemCount: number = 0;
	let { "aria-disabled": disabled } = $$restProps as $$Props;

	let open = false;
	$: isMenuShown = open;
	export { isMenuShown };

	let element: HTMLSelectElement | undefined;
	let buttonBounds: DOMRect | undefined;

	export function show(causedBy?: Event) {
		if (
			!disabled &&
			!open &&
			itemCount > 0 &&
			dispatch("showing", causedBy, { cancelable: true })
		) {
			if (element != null) {
				buttonBounds = element.getBoundingClientRect();
			}
			open = true;
			dispatch("shown", causedBy);
		}
	}

	export function hide(causedBy?: Event) {
		if (
			!disabled &&
			open &&
			dispatch("hiding", causedBy, { cancelable: true })
		) {
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

	function changedWithEffect(index: number, effect: () => void) {
		selectedIndex = index;
		if (dispatch("changed", index, { cancelable: true })) {
			effect();
		}
	}

	export function change(index: number) {
		if (dispatch("changing", index, { cancelable: true })) {
			changed(index);
		}
	}
	function changed(index: number) {
		changedWithEffect(index, () => hide());
	}
	setContext("change", change);

	let dialog: HTMLDialogElement | undefined;
	export function getDialog() {
		return open ? dialog : undefined;
	}

	$: if (open && dialog != null) positionDialog(dialog);
	onDestroy(() => {
		if (dialog != null) {
			dialog.parentElement?.removeChild(dialog);
		}
	});

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
					height - dialogBounds.height,
				)}px`,
				width:
					buttonBounds.width > dialogBounds.width
						? `${buttonBounds.width}px`
						: undefined,
			});
		} else {
			dialog.setCssStyles({
				left: `${Math.max(0, (width - dialogBounds.width) / 2)}px`,
				top: `${Math.max(0, (height - dialogBounds.height) / 2)}px`,
			});
		}
	}

	function onFocusOut(event: FocusEvent) {
		if (dialog == null) {
			return;
		}
		const focusMovedTo = event.relatedTarget;
		if (
			focusMovedTo == null ||
			!(focusMovedTo instanceof Node) ||
			!descendsFrom(focusMovedTo, dialog)
		) {
			hide();
		} else {
			if (element != null) {
				element.focus();
			}
		}
	}

	function descendsFrom(
		potentialDescendant: Node,
		potentialAnscestor: HTMLElement,
	): boolean {
		let node: Node | null = potentialDescendant;
		while (node != null) {
			if (node == potentialAnscestor) {
				return true;
			}
			node = node.parentElement;
		}
		return false;
	}

	const dialogId = "select-dropdown-" + Math.random().toString(36).slice(2);

	function trigger(event: Event) {
		event.preventDefault();

		toggleShown();
	}
</script>

<select
	{...$$restProps}
	class:dropdown={true}
	on:mousedown|preventDefault|stopPropagation={(e) => {
		e.currentTarget.focus();
		trigger(e);
	}}
	on:keydown={(event) => {
		if (event.key === "Enter") {
			trigger(event);
		} else if (event.key === "Escape") {
			hide();
			event.preventDefault();
			event.stopPropagation();
		} else if (event.key === "ArrowUp") {
			if (open) {
				changedWithEffect(Math.max(0, selectedIndex - 1), () => {});
				event.preventDefault();
			}
		} else if (event.key === "ArrowDown") {
			if (open) {
				changedWithEffect(
					Math.min(itemCount - 1, selectedIndex + 1),
					() => {},
				);
				event.preventDefault();
			}
		}
	}}
	on:focusout={onFocusOut}
	on:change={(e) => changed(e.currentTarget.selectedIndex)}
	role="combobox"
	aria-expanded={open}
	aria-owns={dialogId}
	aria-controls={dialogId}
	bind:this={element}
>
	{#each range(itemCount) as itemIndex}
		<option value={itemIndex} selected={selectedIndex === itemIndex}>
			<slot name="item" index={itemIndex}></slot>
		</option>
	{/each}
</select>
<!-- <button
	{...$$restProps}
	class:select={true}
	aria-disabled={disabled}
	disabled={Boolean(disabled)}
	role="combobox"
	aria-labelledby="select button"
	aria-haspopup="listbox"
	aria-expanded={open}
	aria-owns={dialogId}
	aria-controls={dialogId}
	bind:this={button}
	on:click={toggleShown}
	on:focusout={onFocusOut}
>
	<slot name="display"></slot>
</button> -->
{#if open || import.meta.env.MODE === "development"}
	<dialog
		id={dialogId}
		{open}
		class="select-dropdown"
		bind:this={dialog}
		data-popupfor={$$restProps.id}
	>
		<ul role="listbox">
			{#each range(itemCount) as itemIndex}
				<slot name="item" index={itemIndex}></slot>
			{/each}
		</ul>
	</dialog>
{/if}

<style>
	dialog {
		margin: 0;
		border: 0;
		padding: 0;
	}
	ul {
		margin: 0;
		padding: 0;
	}
</style>
