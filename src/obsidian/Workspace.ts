import { Keymap, type Workspace, type WorkspaceLeaf } from "obsidian";

export function openNewLeafFromEvent(
	workspace: Workspace,
	event?: Event,
): WorkspaceLeaf {
	if (event instanceof MouseEvent || event instanceof KeyboardEvent) {
		return workspace.getLeaf(Keymap.isModEvent(event));
	}
	return workspace.getLeaf(true);
}
