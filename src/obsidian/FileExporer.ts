import { Menu, Workspace, type TFile } from "obsidian";
import { warningItem } from "./Menu";

export function openFileContextMenu(
	e: MouseEvent,
	file: TFile,
	workspace: Workspace,
) {
	const menu = new Menu();

	menu.addItem(item => {
		item.setSection("open")
			.setTitle("Open in new tab")
			.setIcon("lucide-file-plus")
			.onClick(() => {
				workspace.openLinkText(file.path, "", "tab");
			});
	})
		.addItem(item => {
			item.setSection("open")
				.setTitle("Open to the right")
				.setIcon("lucide-separator-vertical")
				.onClick(() => {
					workspace.openLinkText(file.path, "", "split");
				});
		})
		.addItem(item => {
			item.setSection("open")
				.setTitle("Open below")
				.setIcon("lucide-separator-horizontal")
				.onClick(() => {
					workspace.getLeaf("split", "horizontal").openFile(file);
				});
		});

	workspace.trigger("file-menu", menu, file, "timeline-item-context-menu");

	menu.addItem(item => {
		warningItem(item)
			.setSection("danger")
			.setTitle("Delete")
			.setIcon("lucide-trash-2")
			.onClick(() => {
				file.vault.delete(file);
			});
	});

	menu.showAtMouseEvent(e);
}
