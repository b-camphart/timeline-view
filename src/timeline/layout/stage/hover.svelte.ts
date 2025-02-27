import { boxContainsPoint, type OffsetBox } from "./TimelineItemElement";


/**
 * Encapsulates the hovering logic for the plot area
 */
export class PlotAreaHover<T extends OffsetBox> {
    constructor(
        private readonly items: () => T[],
        private readonly selectedBounds: () => OffsetBox | null,
        private readonly drag: () => {} | null,
        private readonly minItemSize: () => number,
    ) { }
    #mousePos = $state<[x: number, y: number]>([Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]);

    clear() {
        this.#mousePos = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
    }

    detectHover(offsetX: number, offsetY: number) {
        this.#mousePos = [offsetX, offsetY];
    }

    #hoveredIndex = -1;
    #hoveredItem() {
        const [mouseX, mouseY] = this.#mousePos;
        if (mouseX === Number.NEGATIVE_INFINITY || this.drag() !== null) return null;
        const items = this.items();
        if (this.#hoveredIndex >= 0) {
            const currentlyHoveredItem = items[this.#hoveredIndex];
            if (currentlyHoveredItem && boxContainsPoint(currentlyHoveredItem, mouseX, mouseY)) {
                // no change to index
                return {
                    item: currentlyHoveredItem,
                    index: this.#hoveredIndex,
                    side: this.#side(mouseX, currentlyHoveredItem)
                };
            }
        }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (boxContainsPoint(item, mouseX, mouseY)) {
                this.#hoveredIndex = i;
                return {
                    item,
                    index: i,
                    side: this.#side(mouseX, item)
                };
            }
        }
        this.#hoveredIndex = -1;
        return null;
    }
    private $hoveredItem = $derived(this.#hoveredItem())
    hovered() {
        return this.$hoveredItem
    }

    #side(mouseX: number, item: OffsetBox) {
        const edge = this.minItemSize() / 4
        if (mouseX < item.offsetLeft + edge) {
            return "left"
        }
        if (mouseX >= item.offsetLeft + item.offsetWidth - edge) {
            return "right"
        }

        return "middle"
    }

    #inSelectedBounds = $derived.by<boolean>(() => {
        const bounds = this.selectedBounds();
        if (bounds === null) return false
        const [mouseX, mouseY] = this.#mousePos;
        if (mouseX === Number.NEGATIVE_INFINITY) return false;

        return boxContainsPoint(bounds, mouseX, mouseY);
    })

    inSelectedBounds() {
        return this.#inSelectedBounds;
    }

}