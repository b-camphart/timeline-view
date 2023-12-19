import type { NamespacedWritableFactory } from "src/timeline/Persistence";
import type { Writable } from "svelte/store";

export interface GroupSection {
    readonly collapsed: Writable<boolean>
    readonly groups: Writable<{ query: string, color: string }[]>
}

export function persistedGroupSection(namespace: NamespacedWritableFactory): GroupSection {
    return {
        collapsed: namespace.make("collapsed", true),
        groups: namespace.make("groups", [])
    }
}