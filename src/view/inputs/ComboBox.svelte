<script lang="ts">
	import { createEventDispatcher, tick, type Snippet } from "svelte";
	import { callOnHTMLEvent } from "./ComboBox";
	import DefaultComboBoxItem from "./DefaultComboBoxItem.svelte";

	interface Props {
		display?: Snippet<
			[showOnTarget: (element: HTMLElement) => void]
		> | null;
		choiceList?: Snippet<[{ select: (index: number) => void }]> | null;
		choiceItem?: Snippet<
			[
				{
					choice: string;
					select: (index: number) => void;
					index: number;
					hovered: boolean;
				},
			]
		> | null;
		choices: string[];
		displayValue?: string;
		placeholder?: string | null;
	}

	let {
		display = null,
		choiceList = null,
		choiceItem = null,
		choices,
		placeholder = null,
		displayValue = $bindable(""),
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		showing: null;
		shown: null;
		closing: null;
		closed: null;
		select: number;
	}>();

	let target: HTMLElement | null = $state(null);
	let dialog: HTMLDialogElement | null = $state(null);
	let positionX = $state(-1);
	let positionY = $state(-1);
	let hovered: number = 0;

	const open = $derived(target !== null);

	$effect(() => {
		if (target !== null && dialog !== null) {
			if (dialog.parentElement != document.body) {
				document.body.appendChild(dialog);
			}

			positionDialog(dialog, target);
		}
	});

	let previousTarget: HTMLElement | null = $state(null);
	$effect(() => {
		if (target !== null) {
			if (previousTarget !== null) {
				previousTarget.removeEventListener(
					"focusout",
					targetFocusOutListener,
				);
			}
			previousTarget = target;
			target.addEventListener("focusout", targetFocusOutListener);
		}
	});

	const targetFocusOutListener = (event: FocusEvent) => {
		if (dialog == null) {
			return;
		}
		const focusMovedTo = event.relatedTarget;
		if (
			focusMovedTo == null ||
			!(focusMovedTo instanceof Node) ||
			!descendsFrom(focusMovedTo, dialog)
		) {
			close();
		}
	};

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

	async function positionDialog(
		dialog: HTMLDialogElement,
		target: HTMLElement,
	) {
		await tick();

		const targetBounds = target.getBoundingClientRect();
		const { width, height } = window.visualViewport!;
		const dialogBounds = dialog.getBoundingClientRect();

		positionX = Math.min(targetBounds.x, width - dialogBounds.width);
		positionY = Math.min(
			targetBounds.y + targetBounds.height,
			height - dialogBounds.height,
		);
	}

	function showOnTarget(element: HTMLElement) {
		if (dispatch("showing")) {
			target = element;
			dispatch("shown");
		}
	}

	function close() {
		if (dispatch("closing")) {
			target = null;
			dispatch("closed");
		}
	}

	function select(index: number) {
		close();
		displayValue = choices[index];
		dispatch("select", index);
	}
</script>

{#if display !== null}
	{@render display(showOnTarget)}
{:else}
	<input
		type="text"
		{placeholder}
		onfocusin={callOnHTMLEvent(showOnTarget)}
		bind:value={displayValue}
	/>
{/if}
{#if open || import.meta.env.MODE === "development"}
	<dialog
		class="combo-box-popup"
		{open}
		bind:this={dialog}
		style="left:{positionX}px;top:{positionY}px;"
	>
		{#if choiceList !== null}
			{@render choiceList({ select })}
		{:else if choiceItem !== null}
			{#each choices as choice, index}
				{@render choiceItem({
					choice,
					select,
					index,
					hovered: hovered == index,
				})}
			{/each}
		{:else}
			{#each choices as choice, index}
				<DefaultComboBoxItem
					{choice}
					{select}
					{index}
					hovered={hovered == index}
				/>
			{/each}
		{/if}
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
