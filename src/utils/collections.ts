class SortedArray<out T> implements Iterable<T> {
	readonly #items: T[] = [];

	constructor(items: T[]) {
		this.#items = items;
	}

	get items(): readonly T[] {
		return this.#items;
	}

	get length(): number {
		return this.#items.length;
	}

	[Symbol.iterator](): Iterator<T> {
		return this.#items[Symbol.iterator]();
	}
}
export type { SortedArray };
export function sortedArray<T>(selector: (item: T) => number, ...items: T[]) {
	return new SortedArray(items.sort((a, b) => selector(a) - selector(b)));
}

export class MutableSortedArray<T> implements Omit<SortedArray<T>, never> {
	#items;
	#selector: (item: T) => number;

	private constructor(selector: (item: T) => number, items: T[]) {
		this.#selector = selector;
		this.#items = items;
	}

	static of<T>(selector: (item: T) => number, ...items: T[]) {
		return new MutableSortedArray<T>(
			selector,
			items.sort((a, b) => selector(a) - selector(b)),
		);
	}

	clone() {
		return new MutableSortedArray<T>(this.#selector, this.#items);
	}

	/** makes a copy of the list */
	Readonly() {
		return new SortedArray<T>(this.#items.slice());
	}

	get items() {
		return this.#items;
	}

	get length() {
		return this.#items.length;
	}

	[Symbol.iterator](): Iterator<T> {
		return this.#items[Symbol.iterator]();
	}

	add(item: T) {
		if (this.#items.length === 0) {
			this.#items.push(item);
			return;
		}

		const itemValue = this.#selector(item);

		if (this.#items.length === 1) {
			if (this.#selector(this.#items[0]) > itemValue) {
				this.#items.unshift(item);
			} else {
				this.#items.push(item);
			}
			return;
		}

		const findInsertionIndex = (low: number, high: number) => {
			if (high <= low) {
				// console.debug("adding item", item, "at", low, {
				// 	items: this.items,
				// });
				return low;
			}
			const mid = (low + high) >> 1;
			// console.log("findInsertionIndex", {low, high, mid});
			const midItemValue = this.#selector(this.#items[mid]);
			if (midItemValue === itemValue) {
				// console.debug(
				// 	`adding item`,
				// 	item,
				// 	"at",
				// 	mid,
				// 	"because it matches",
				// 	this._items[mid],
				// );
				return mid;
			}

			if (midItemValue > itemValue) {
				return findInsertionIndex(low, mid);
			}
			return findInsertionIndex(mid + 1, high);
		};

		const insertionIndex = findInsertionIndex(0, this.#items.length);
		this.#items.splice(insertionIndex, 0, item);
	}

	remove(item: T) {
		if (this.#items.length === 0) {
			return;
		}

		const itemValue = this.#selector(item);
		const findRemoveIndex = (low: number, high: number) => {
			if (high < low) {
				return -1;
			}
			const mid = (low + high) >> 1;
			if (mid < 0 || mid >= this.#items.length) {
				return -1;
			}
			const midItemValue = this.#selector(this.#items[mid]);
			if (midItemValue === itemValue) {
				let checkStart = mid;
				do {
					if (this.#items[checkStart] === item) {
						return checkStart;
					}
					checkStart = checkStart - 1;
				} while (
					checkStart >= 0 &&
					this.#selector(this.#items[checkStart]) === itemValue
				);
				let checkEnd = mid + 1;
				while (
					checkEnd < this.#items.length &&
					this.#selector(this.#items[checkEnd]) === itemValue
				) {
					if (this.#items[checkEnd] === item) {
						return checkEnd;
					}
					checkEnd++;
				}
				return -1;
			}

			if (midItemValue > itemValue) {
				return findRemoveIndex(low, mid - 1);
			} else {
				return findRemoveIndex(mid + 1, high);
			}
		};

		const removeIndex = findRemoveIndex(0, this.#items.length);
		if (removeIndex >= 0) {
			this.#items.splice(removeIndex, 1);
		}
	}
}

export function* mapIterable<T, R>(
	i: Iterable<T>,
	transform: (t: T) => R,
): Iterable<R> {
	for (let t of i) {
		yield transform(t);
	}
}
