import * as obsidian from "obsidian";

export function openNewLeafFromEvent(
	workspace: obsidian.Workspace,
	event?: Event,
): obsidian.WorkspaceLeaf {
	if (event instanceof MouseEvent || event instanceof KeyboardEvent) {
		return workspace.getLeaf(obsidian.Keymap.isModEvent(event));
	}
	return workspace.getLeaf(true);
}
