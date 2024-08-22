import type {ItemView} from "obsidian";

declare module "obsidian" {
	interface ItemView {
		/**
		 * @private
		 */
		titleEl: TitleElement | undefined;
	}
}

type TitleElement = {
	setText: ((value: string) => void) | undefined;
};

export function titleEl(itemView: ItemView): TitleElement | undefined {
	if (!itemView.titleEl) {
		return undefined;
	}
	return itemView.titleEl;
}
