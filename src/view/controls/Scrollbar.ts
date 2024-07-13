export type ValueChangeEventDetail = {
	/**
	 * The amount of pixels that the thumb moved
	 */
	deltaPixels: number;
	/**
	 * The value that the thumb moved, given the ratio between visibleAmount and (max - min)
	 */
	deltaValue: number;
	/**
	 * The suggested new value
	 */
	value: number;

	/**
	 * The ratio used to calculate deltaPixels to deltaValue
	 *
	 * deltaPixels / deltaValue;
	 */
	ratio: number;
};
export type ValueChangeEvent = CustomEvent<ValueChangeEventDetail>;

export type DraggedChangeEventDetail = ValueChangeEventDetail & {
	/**
	 * The amount of pixels that the thumb moved since the start of the drag
	 */
	deltaPixelsSinceStart: number;

	/**
	 * The value that the thumb moved since the start of the drag
	 */
	deltaValueSinceStart: number;

	/**
	 * The value at the start of the drag.
	 */
	startValue: number;
};
export type DraggedScrollEvent = CustomEvent<DraggedChangeEventDetail>;

export type ChangeEventDetail =
	| (ValueChangeEventDetail & { dragging: false })
	| (DraggedChangeEventDetail & { dragging: true });

export type ChangeEvent = CustomEvent<ChangeEventDetail>;
