import { untrack } from "svelte";
import type { OffsetBox } from "./TimelineItemElement";

export class PlotAreaFocus<T extends { readonly id: string }> {
    /** @reactive */
    #index = $state(-1);
    #id = ""
    /**
     * Always check index before setting.
     */
    #setIndex(index: number) {
        if (index === -1) {
            this.#index = index;
            this.#id = "";
            return
        }
        const currentIndex = untrack(() => this.#index)
        if (currentIndex !== index) {
            this.#index = index;
            // no check for bounds because this is a private member and it should only be called with valid indices
            const item = this.plotarea.items()[index];
            this.#id = item.id;
            this.onFocused(item, index);
        }
    }

    constructor(private readonly plotarea: {
        hoveredItem(): { index: number, item: T } | null,
        items(): T[],
        scrollIntoView(item: T): void
    }, private readonly onFocused: (item: T, index: number) => void) { }

    #focusEventCausedByMouse = false;
    #mouseDownOn: T | null = null;
    mousePressed() {
        this.#focusEventCausedByMouse = true;
        const hoveredItem = this.plotarea.hoveredItem()
        this.#mouseDownOn = hoveredItem?.item ?? null;
        this.#setIndex(hoveredItem?.index ?? -1)
    }
    mouseReleased(event: MouseEvent) {
        // right-click either was on an item and we already set the focus, or it was never on an item and we don't care
        if (event.button === 2) return;
        // wasn't a click on an item, so no need to change focus
        if (this.#mouseDownOn === null || this.#mouseDownOn !== this.plotarea.hoveredItem()?.item) return;
        this.#setIndex(-1)
    }
    keyPressed(event: KeyboardEvent) {
        if (event.key !== "Tab") return;

        const nextIndex = event.shiftKey ? this.#index - 1 : this.#index + 1;
        if (nextIndex < 0 || nextIndex >= this.plotarea.items().length) {
            this.#setIndex(-1)
            return;
        }

        this.#setIndex(nextIndex)
        event.stopPropagation();
        event.preventDefault();
        this.plotarea.scrollIntoView(this.plotarea.items()[nextIndex])
    }
    focused(event: FocusEvent) {
        // if this event was caused by keyboard navigation (tabbing into it from another element),
        // then we don't want to focus on the canvas itself (default behavior), but on the first element
        // however, if it was caused by a mouse press, the focus logic will have already been handled 
        // above
        if (!this.#focusEventCausedByMouse) {
            if (this.plotarea.items().length > 0) {
                this.#setIndex(0)
                event.stopPropagation();
                event.preventDefault();
            }
        }
        this.#focusEventCausedByMouse = false;
    }


    focusOnId(id: string) {
        const items = this.plotarea.items()
        const index = items.findIndex(it => it.id === id);

        if (index >= 0) {
            this.#setIndex(index)
            this.plotarea.scrollIntoView(items[index])
        } else {
            this.#setIndex(-1)
        }
    }

    /** 
     * @reactive effect
     * 
     * Keep the focused item in view when the focused item changes its *layout* position
     */
    follow() {
        // if the user has explicitly scrolled away from the focused item, that's fine,
        // instead, this really is just to keep the focused item in view if the layout changes
        // (like in the case of a new item receiving a value/length change, resulting in a layout)

        const index = untrack(() => this.#index)
        if (index < 0) return;
        const items = this.plotarea.items()
        const item = items[index];
        if (!item || item.id !== this.#id) {
            const newIndex = items.findIndex(it => it.id === this.#id);
            this.#setIndex(newIndex);
            if (newIndex < 0) {
                return;
            }
        }

        this.plotarea.scrollIntoView(items[this.#index])
    }

    /** @reactive */
    focusedBounds(offsetItems: readonly OffsetBox[]): null | OffsetBox {
        const item = offsetItems[this.#index] ?? null;
        if (item === null) return null;
        return {
            offsetTop: item.offsetTop,
            offsetLeft: item.offsetLeft,
            offsetWidth: item.offsetWidth,
            offsetHeight: item.offsetHeight
        }
    }
}