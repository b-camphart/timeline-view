import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

export function createLargeVault() {
    const testVault = join(process.cwd(), "testVault")
    const largeVaultFolder = join(testVault, "Large Folder")

    if (! existsSync(largeVaultFolder)) {
        mkdirSync(largeVaultFolder)
    }

    let failed = false;
    for (let i = 0; i < 10000 && !failed; i++) {
        const content = `---
value: ${Math.floor(Math.random() * 10000)}
---
        `
        writeFileSync(join(largeVaultFolder, i.toString() + ".md"), content)
    }

}

createLargeVault();