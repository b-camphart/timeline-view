import { existsSync, mkdirSync, writeFileSync } from "fs";
import initialSettings from "./initialSettings";

export function initializeTestVault(directory: string) {
    if (! existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
    }

    for (const fileName of Object.keys(initialSettings)) {
        const fileContent = initialSettings[fileName];
        writeFileSync(`${directory}/${fileName}`, JSON.stringify(fileContent, null, '\t'));
    }
}