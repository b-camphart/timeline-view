export interface LayoutItem {
	readonly layoutTop: number;
	readonly layoutLeft: number;
	readonly layoutBottom: number;
	readonly layoutRight: number;

	readonly offsetWidth: number;
	readonly offsetHeight: number;
}

export interface Scrollable {
	scroll(top: number, left: number): void;
}

export function scrollItems(
	layoutItems: readonly Scrollable[],
	top: number,
	left: number,
) {
	layoutItems.forEach((it) => it.scroll(top, left));
}
