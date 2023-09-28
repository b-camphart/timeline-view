import { writeFileSync } from "fs";
import manifest from "./manifest";
import versions from "./versions";

// update versions.json with target version and minAppVersion from manifest.json
if (! (manifest.version in versions)) {
    const versionsUpdate = {...versions} as { [version: string]: string };
    versionsUpdate[manifest.version] = manifest.minAppVersion;
    writeFileSync(
        "src/obsidian/versions.ts", 
        `export default ${JSON.stringify(versionsUpdate, null, "\t")};`
    );
    
}