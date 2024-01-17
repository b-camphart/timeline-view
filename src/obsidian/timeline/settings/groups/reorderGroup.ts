import type { TimelineItem } from "src/timeline/Timeline";
import type { TimelineFileItem } from "../../TimelineFileItem";
import type { ItemGroup } from "./FileGroup";
import { selectGroupForFile } from "./selectGroupForFile";
import { longProcess } from "../longProcess";

interface Context {
    readonly groups: {
        getGroup(groupId: string): ItemGroup | undefined;
        saveGroup(group: ItemGroup): void;
        list(): readonly ItemGroup[];
        getOrder(): readonly string[];
        setOrder(order: readonly string[]): void;
    }

    readonly items: {
        list(): readonly TimelineFileItem[];
    }

    recolorProcess: { stop: () => void; } | undefined;
}

interface Output {
    presentReorderedGroups(groups: readonly ItemGroup[]): void;
    presentRecoloredItem(item: TimelineItem): void;
}

export async function reorderGroup(this: Context, groupId: string, toIndex: number, output: Output) {

    const order = this.groups.getOrder()
    const index = order.indexOf(groupId)
    if (index < 0) {
        return
    }

    this.recolorProcess?.stop()
    this.recolorProcess = undefined

    const newOrder = order.toSpliced(index, 1)
    newOrder.splice(toIndex, 0, groupId)
    this.groups.setOrder(newOrder)

    const groups = this.groups.list()
    output.presentReorderedGroups(groups)

    for (const item of this.items.list()) {
        item.forgetGroup()
    }

    const selectGroup = selectGroupForFile.bind(null, groups)

    const process = longProcess(this.items.list(), async (item) => {
        const group = await selectGroup(item.obsidianFile)
        item.applyGroup(group)
        output.presentRecoloredItem(item)
    })

    this.recolorProcess = process

    try {
        await process.completion();
    } catch (e: unknown) {
        if (typeof e === "string" && e === "Cancelled") {

        } else {
            throw e
        }
    }

    this.recolorProcess = undefined





}