import { mkdirSync, writeFile } from 'fs'
import { join } from 'path'

export function createLargeVault() {
    const testVault = join(process.cwd(), "testVault")
    const largeVaultFolder = join(testVault, "Large Folder")

    mkdirSync(largeVaultFolder)

    let failed = false;
    for (let i = 0; i < 2000 && !failed; i++) {
        writeFile(join(largeVaultFolder, i.toString() + ".md"), "", (err) => {
            console.error(err)
            failed = true
        })
    }

}

createLargeVault();