import type { ItemGroup } from "./FileGroup"

interface Context {
    groups: {
        list(): readonly ItemGroup[];
    }
}

interface Output {
    presentGroups(groups: readonly ItemGroup[]): void;
}

export function listExistingGroups(this: Context, output: Output) {
    const groups = this.groups.list();
    output.presentGroups(groups)
}