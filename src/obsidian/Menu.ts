import type { MenuItem } from "obsidian";

export function warningItem(item: MenuItem) {
	if ("setWarning" in item && typeof item.setWarning === "function") {
		item.setWarning(true);
	}
	return item;
}
