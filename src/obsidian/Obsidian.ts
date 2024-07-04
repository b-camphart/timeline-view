import type { Workspace } from "./workspace";

/**
 * The interface we wish we had for obsidian.
 */
export interface Obsidian {
	workspace(): Workspace;
}
