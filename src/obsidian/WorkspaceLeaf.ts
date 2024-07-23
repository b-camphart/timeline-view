import {
	WorkspaceLeaf,
	type ItemView,
	type OpenViewState,
	type TFile,
} from "obsidian";

export function workspaceLeafExt(leaf: WorkspaceLeaf): WorkspaceLeafExt | null {
	if (
		"updateHeader" in leaf &&
		typeof leaf.updateHeader === "function" &&
		leaf.updateHeader != null
	) {
		return leaf as WorkspaceLeafExt;
	}

	return null;
}

type WorkspaceLeafExt = WorkspaceLeaf & {
	updateHeader(): void;
};

export function preventOpenFileWhen(
	component: ItemView,
	condition: (file: TFile, openState?: OpenViewState) => boolean,
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
