import {SvelteMap} from "svelte/reactivity";

export class Selection<T extends {id: string}> {
	#items = new SvelteMap<string, T>();
	length() {
		return this.#items.size;
	}
	isEmpty() {
		return this.#items.size === 0;
	}
	has(item: T) {
		return this.#items.has(item.id);
	}
	items() {
		return Array.from(this.#items.values());
	}
	[Symbol.iterator](): Iterator<T> {
		return this.#items.values();
	}

	clear() {
		this.#items.clear();
	}
	replaceWith(items: readonly T[]) {
		if (items.length === this.#items.size && items.every(it => !this.has(it))) return;
		this.clear();
		this.addAll(items);
	}
	addAll(items: readonly T[]) {
		for (const item of items) {
			this.#items.set(item.id, item);
		}
	}
}
