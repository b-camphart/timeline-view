import type { Files } from "./files/Files";
import type { Properties } from "./properties/Properties"

/**
 * The interface we wish we had for obsidian.
 */
export interface Obsidian {

    vault: ObsidianVault

}

export interface ObsidianVault {

    properties: Properties;
    files: Files;

}