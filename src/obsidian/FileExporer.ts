import obsidian from "obsidian";
import { warningItem } from "./Menu";

export function openFileContextMenu(
	e: MouseEvent,
	file: obsidian.TFile,
	workspace: obsidian.Workspace,
	fileManager: obsidian.FileManager,
) {
	const menu = new obsidian.Menu();

	menu.addItem((item) => {
		item.setSection("open")
			.setTitle("Open in new tab")
			.setIcon("lucide-file-plus")
			.onClick(() => {
				workspace.openLinkText(file.path, "", "tab");
			});
	})
		.addItem((item) => {
			item.setSection("open")
				.setTitle("Open to the right")
				.setIcon("lucide-separator-vertical")
				.onClick(() => {
					workspace.openLinkText(file.path, "", "split");
				});
		})
		.addItem((item) => {
			item.setSection("open")
				.setTitle("Open below")
				.setIcon("lucide-separator-horizontal")
				.onClick(() => {
					workspace.getLeaf("split", "horizontal").openFile(file);
				});
		});

	workspace.trigger("file-menu", menu, file, "timeline-view-context-menu");

	menu.addItem((item) => {
		warningItem(item)
			.setSection("danger")
			.setTitle("Delete")
			.setIcon("lucide-trash-2")
			.onClick(() => {
				if ("promptForDeletion" in fileManager && typeof fileManager.promptForDeletion === "function") {
					fileManager.promptForDeletion(file);
				} else {
					fileManager.trashFile(file);
				}
			});
	});

	menu.showAtMouseEvent(e);
}

export function openMultipleFileContextMenu(
	e: MouseEvent,
	files: obsidian.TFile[],
	workspace: obsidian.Workspace,
	fileManager: obsidian.FileManager,
) {
	const menu = new obsidian.Menu();

	workspace.trigger("files-menu", menu, files, "timeline-view-context-menu");

	menu.addItem((item) => {
		warningItem(item)
			.setSection("danger")
			.setTitle("Delete")
			.setIcon("lucide-trash-2")
			.onClick(() => {
				let deleteFunction: (file: obsidian.TFile) => void;

				if ("promptForDeletion" in fileManager && typeof fileManager.promptForDeletion === "function") {
					deleteFunction = fileManager.promptForDeletion.bind(fileManager);
				} else {
					deleteFunction = fileManager.trashFile.bind(fileManager);
				}

				for (const file of files) {
					deleteFunction(file);
				}
			});
	});

	menu.showAtMouseEvent(e);
}
