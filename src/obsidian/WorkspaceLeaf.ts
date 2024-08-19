import * as obsidian from "obsidian";

export function workspaceLeafExt(
	leaf: obsidian.WorkspaceLeaf,
): WorkspaceLeafExt | null {
	if (
		"updateHeader" in leaf &&
		typeof leaf.updateHeader === "function" &&
		leaf.updateHeader != null
	) {
		return leaf as WorkspaceLeafExt;
	}

	return null;
}

type WorkspaceLeafExt = obsidian.WorkspaceLeaf & {
	updateHeader(): void;
};

export function preventOpenFileWhen(
	component: obsidian.ItemView,
	condition: (
		file: obsidian.TFile,
		openState?: obsidian.OpenViewState,
	) => boolean,
) {
	const openFile = component.leaf.openFile;
	component.leaf.openFile = async (file, openState) => {
		if (condition(file, openState)) {
			return;
		}
		return openFile.call(component.leaf, file, openState);
	};
	// @ts-ignore
	const onClose = component.onClose;
	// @ts-ignore
	component.onClose = () => {
		component.leaf.openFile = openFile;
		onClose.call(component);
	};
}
