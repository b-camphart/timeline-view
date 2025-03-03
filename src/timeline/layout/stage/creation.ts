import type {Scale} from "src/timeline/scale";
import type {HoveredItem} from "./hover.svelte";

/**
 * Encapsulates the logic for creating an item within the plot area
 */
export class PlotAreaItemCreation<T> {
	constructor(
		private readonly isEditable: () => boolean,
		private readonly hoveredItem: () => HoveredItem<T> | null,
		private readonly scale: () => Scale,
		private readonly focalValue: () => number,
		private readonly clientWidth: () => number,
		private readonly createItem: (value: number, cause: Event) => void,
	) {}

	dblClick(event: MouseEvent) {
		if (!this.isEditable()) return;
		if (this.hoveredItem() !== null) return;

		const scale = this.scale();
		const leftValue = this.focalValue() - scale.toValue(this.clientWidth() / 2);
		const valueFromLeft = scale.toValue(event.offsetX);
		const value = leftValue + valueFromLeft;

		this.createItem(value, event);
	}
}
