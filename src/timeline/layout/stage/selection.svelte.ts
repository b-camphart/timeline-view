import { untrack } from "svelte";

export class Selection<T extends { id: string }> {
	#indexById = new Map<string, number>();
	#selectedIds = $state.raw({ value: new Set<string>() });

	updateItems(items: readonly T[]) {
		const selectedIds = untrack(() => this.#selectedIds).value;
		const existingIds = new Set<string>();
		const remove: string[] = [];
		let update = false;
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			existingIds.add(item.id);
			if (this.#indexById.get(item.id) !== i) {
				update = true;
				this.#indexById.set(item.id, i);
			}
		}
		for (const id of selectedIds.keys()) {
			if (!existingIds.has(id)) {
				remove.push(id);
			}
		}
		if (remove.length === 0 && !update) {
			return;
		}
		for (const id of remove) {
			selectedIds.delete(id);
			this.#indexById.delete(id);
		}
		this.#selectedIds = { value: selectedIds };
	}

	length() {
		return this.#selectedIds.value.size;
	}
	isEmpty() {
		return this.length() === 0;
	}
	hasId(id: string) {
		return this.#selectedIds.value.has(id);
	}

	items(from: T[]): T[] {
		const selectedIds = this.#selectedIds.value;
		const items: T[] = [];
		for (const id of selectedIds.values()) {
			const idx = this.#indexById.get(id)!;
			items.push(from[idx]);
		}
		return items;
	}

	clear() {
		if (untrack(() => this.#selectedIds).value.size === 0) {
			return;
		}
		this.#selectedIds = { value: new Set() };
	}
	replaceWith(items: readonly T[]) {
		const selectedIds = untrack(() => this.#selectedIds).value;
		if (
			untrack(
				() =>
					items.length === selectedIds.size &&
					items.every((it) => selectedIds.has(it.id))
			)
		)
			return;
		this.#selectedIds = { value: new Set(items.map((it) => it.id)) };
	}
	addAll(items: readonly T[]) {
		const selectedIds = untrack(() => this.#selectedIds).value;
		for (const item of items) {
			selectedIds.add(item.id);
		}
		this.#selectedIds = { value: selectedIds };
	}
	remove(item: T) {
		const selectedIds = untrack(() => this.#selectedIds).value;
		if (!selectedIds.has(item.id)) return;
		selectedIds.delete(item.id);
		this.#selectedIds = { value: selectedIds };
	}
}
