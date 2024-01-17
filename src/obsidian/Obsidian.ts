import type { Files } from "./files/Files";
import type { Properties } from "./properties/Properties"
import type { Workspace } from "./workspace";

/**
 * The interface we wish we had for obsidian.
 */
export interface Obsidian {

    vault(): ObsidianVault

    workspace(): Workspace

}

export interface ObsidianVault {

    properties(): Properties;
    files(): Files;

}