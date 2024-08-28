export class SortedArray<out T> implements Iterable<T> {
	protected _items: T[] = [];

	constructor(selector: (item: T) => number, ...items: T[]) {
		items.sort((a, b) => selector(a) - selector(b));
		this._items = items;
	}

	get items(): readonly T[] {
		return this._items;
	}

	get length(): number {
		return this._items.length;
	}

	[Symbol.iterator](): Iterator<T> {
		return this._items[Symbol.iterator]();
	}
}

export class MutableSortedArray<T> extends SortedArray<T> {
	#selector: (item: T) => number;

	constructor(selector: (item: T) => number, ...items: T[]) {
		super(selector, ...items);
		this.#selector = selector;
	}

	add(item: T) {
		if (this.items.length === 0) {
			this._items.push(item);
			return;
		}

		const itemValue = this.#selector(item);

		if (this._items.length === 1) {
			if (this.#selector(this._items[0]) > itemValue) {
				this._items.unshift(item);
			} else {
				this._items.push(item);
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
			const midItemValue = this.#selector(this._items[mid]);
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

		const insertionIndex = findInsertionIndex(0, this._items.length);
		this._items.splice(insertionIndex, 0, item);
	}

	remove(item: T) {
		if (this.items.length === 0) {
			return;
		}

		const itemValue = this.#selector(item);
		const findRemoveIndex = (low: number, high: number) => {
			if (high < low) {
				return -1;
			}
			const mid = (low + high) >> 1;
			if (mid < 0 || mid >= this._items.length) {
				return -1;
			}
			const midItemValue = this.#selector(this._items[mid]);
			if (midItemValue === itemValue) {
				let checkStart = mid;
				do {
					if (this._items[checkStart] === item) {
						return checkStart;
					}
					checkStart = checkStart - 1;
				} while (
					checkStart >= 0 &&
					this.#selector(this._items[checkStart]) === itemValue
				);
				let checkEnd = mid + 1;
				while (
					checkEnd < this._items.length &&
					this.#selector(this._items[checkEnd]) === itemValue
				) {
					if (this._items[checkEnd] === item) {
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

		const removeIndex = findRemoveIndex(0, this._items.length);
		if (removeIndex >= 0) {
			this._items.splice(removeIndex, 1);
		}
	}
}
