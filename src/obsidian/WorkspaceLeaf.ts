import type { WorkspaceLeaf } from "obsidian";

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
