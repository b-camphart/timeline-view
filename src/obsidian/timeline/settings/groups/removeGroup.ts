import type { TimelineItem } from "src/timeline/Timeline";
import type { TimelineNoteItem } from "src/timeline/TimelineNoteItem";
import type { ItemGroup } from "./FileGroup";
import { selectGroupForFile } from "./selectGroupForFile";
import { longProcess } from "../longProcess";

/**
 * Context for removing group from list
 */
interface Context {
    recolorProcess: { stop: () => void; } | undefined;
    readonly groups: {
        list(): readonly ItemGroup[];
        removeGroup(groupId: string): boolean;
    }

    readonly items: {
        list(): readonly TimelineNoteItem[];
    }
}

interface Output {
    hideGroup(groupId: string): void;
    presentRecoloredItem(item: TimelineItem): void;
}


export async function removeGroup(this: Context, groupId: string, output: Output) {
    if (!this.groups.removeGroup(groupId)) {
        return;
    }

    this.recolorProcess?.stop();
    this.recolorProcess = undefined;
    // parse the query to get the filter and apply that to the group
    const groups = this.groups.list();
    output.hideGroup(groupId)

    const items = this.items.list().filter(it => it.group() === groupId || it.group() == null)
    for (const item of items) {
        item.forgetGroup();
    }

    const selectGroup = selectGroupForFile.bind(null, groups)

    const process = longProcess(items, async (item) => {
        const group = await selectGroup(item.note)
        item.applyGroup(group)
        output.presentRecoloredItem(item)
    })

    this.recolorProcess = process

    try {
        await process.completion();
    } catch(e: unknown) {
        if (typeof e === "string" && e === "Cancelled") {

        } else {
            throw e
        }
    }

    this.recolorProcess = undefined
}