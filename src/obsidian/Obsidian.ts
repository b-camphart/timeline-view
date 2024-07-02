import type { Files } from "./files/Files";
import type { Workspace } from "./workspace";

/**
 * The interface we wish we had for obsidian.
 */
export interface Obsidian {

    vault(): ObsidianVault

    workspace(): Workspace

}

export interface ObsidianVault {

    files(): Files;

}