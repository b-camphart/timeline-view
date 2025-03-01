import type {HoveredItem} from "./hover.svelte";
import {boxContainsPoint, type OffsetBox} from "./TimelineItemElement";

/**
 * Encapsulates the context menu logic for the plot area
 */
export class PlotAreaContextMenu<T> {
	constructor(
		private readonly selectedBounds: () => OffsetBox | null,
		private readonly selectedItems: () => T[],
		private readonly hoveredItem: () => null | HoveredItem<T>,
		private readonly showContextMenu: (cause: MouseEvent, items: T[]) => void,
	) {}

	mouseReleased(event: MouseEvent) {
		if (event.button !== 2) return;
		const selectedBounds = this.selectedBounds();
		if (selectedBounds !== null && boxContainsPoint(selectedBounds, event.offsetX, event.offsetY)) {
			this.showContextMenu(event, this.selectedItems());
			return;
		}

		const hoveredItem = this.hoveredItem();
		if (hoveredItem === null) return;
		this.showContextMenu(event, [hoveredItem.item]);
	}
}
