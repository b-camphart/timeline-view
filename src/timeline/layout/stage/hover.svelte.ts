import {boxContainsPoint, type OffsetBox} from "./TimelineItemElement";

/**
 * Encapsulates the hovering logic for the plot area
 *
 * Hover is used for two things:
 * - displaying an item's name and value(s) to the user
 * - indicating a potential action if the mouse is pressed
 *
 */
export class PlotAreaHover<T extends OffsetBox> {
	constructor(
		private readonly items: () => readonly T[],
		private readonly selectedBounds: () => OffsetBox | null,
		private readonly drag: () => unknown | null,
		private readonly minItemSize: () => number,
		private readonly isResizable: () => boolean,
		private readonly isEditable: () => boolean,
	) {}
	#mousePos = $state<[x: number, y: number]>([Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]);

	clear() {
		this.#mousePos = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
	}

	mouseMoved(offsetX: number, offsetY: number) {
		this.#mousePos = [offsetX, offsetY];
	}
	mouseReleased(event: MouseEvent) {
		this.#mousePos = [event.offsetX, event.offsetY];
	}

	/** prevents re-checking the entire item array when mouse is moved, if still hovered */
	#prevIndex = -1;
	/** @reactive */
	item() {
		const item = this.$item;
		this.#prevIndex = item?.index ?? -1;
		return item;
	}

	/** @reactive */
	private readonly $item = $derived(this.#item());

	#item(): HoveredItem<T> | null {
		const [mouseX, mouseY] = this.#mousePos;
		if (mouseX === Number.NEGATIVE_INFINITY || this.drag() !== null) return null;
		const items = this.items();
		// quickly check if the currently hovered item is still hovered to avoid checking ALL items
		if (this.#prevIndex !== -1) {
			const item: T | null = items[this.#prevIndex] ?? null;
			if (item !== null) {
				if (boxContainsPoint(item, mouseX, mouseY)) {
					return new HoveredItem(item, this.#prevIndex);
				}
			}
		}

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (boxContainsPoint(item, mouseX, mouseY)) {
				return new HoveredItem(item, i);
			}
		}
		return null;
	}

	#mouseDownAction(): MouseDownAction<T> {
		const hoveredItem = this.item();
		if (hoveredItem !== null) {
			if (!this.isResizable()) return new SelectItem(hoveredItem.item, hoveredItem.index);
			const edge = this.#edge(this.#mousePos[0], hoveredItem.item);
			if (edge === null) return new SelectItem(hoveredItem.item, hoveredItem.index);
			return new ResizeItem(edge, hoveredItem.item, hoveredItem.index);
		}
		if (this.isEditable() && this.drag() === null && this.#inSelectedBounds()) return new MoveAll();
		return new DefaultMouseDownAction();
	}

	/** @reactive */
	private readonly $mouseDownAction = $derived(this.#mouseDownAction());

	/** @reactive */
	mouseDownAction(): MouseDownAction<T> {
		return this.$mouseDownAction;
	}

	#edge(mouseX: number, item: OffsetBox): null | ResizeItemEdge {
		const edge = this.minItemSize() / 3;
		if (mouseX <= item.offsetLeft + edge) {
			return ResizeItemEdge.Left;
		}
		if (mouseX >= item.offsetLeft + item.offsetWidth - edge) {
			return ResizeItemEdge.Right;
		}

		return null;
	}

	#inSelectedBounds() {
		const bounds = this.selectedBounds();
		if (bounds === null) return false;
		const [mouseX, mouseY] = this.#mousePos;
		if (mouseX === Number.NEGATIVE_INFINITY) return false;

		return boxContainsPoint(bounds, mouseX, mouseY);
	}
}

export class HoveredItem<T> {
	constructor(
		readonly item: T,
		readonly index: number,
	) {}
}

class DefaultMouseDownAction {
	get name() {
		return "default" as const;
	}
}
class ResizeItem<T> {
	constructor(
		readonly edge: ResizeItemEdge,
		readonly item: T,
		readonly index: number,
	) {}
	get name() {
		switch (this.edge) {
			case ResizeItemEdge.Left:
				return "resize-start" as const;
			case ResizeItemEdge.Right:
				return "resize-end" as const;
		}
	}
}
export const enum ResizeItemEdge {
	Left,
	Right,
}
class SelectItem<T> {
	get name() {
		return "select-item" as const;
	}
	constructor(
		readonly item: T,
		readonly index: number,
	) {}
}
class MoveAll {
	get name() {
		return "move-all" as const;
	}
}

type MouseDownAction<T> = DefaultMouseDownAction | ResizeItem<T> | SelectItem<T> | MoveAll;
