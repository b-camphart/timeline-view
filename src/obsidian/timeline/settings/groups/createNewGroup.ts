import type { TimelineItem } from "src/timeline/Timeline";
import type { TimelineFileItem } from "../../TimelineFileItem";
import type { ItemGroup } from "./FileGroup";
import { selectGroupForFile } from "./selectGroupForFile";
import { longProcess } from "../longProcess";

interface Context {
    groups: {
        list(): readonly ItemGroup[];
        addNewGroup(data: { query: string, color: string }): ItemGroup
    }
    readonly items: {
        list(): readonly TimelineFileItem[];
    }
    recolorProcess: { stop(): void } | undefined;
}

interface Output {
    presentNewGroup(group: ItemGroup): void;
    presentRecoloredItem(item: TimelineItem): void;
}

const defaultGroupColors = [
    "#e05252",
    "#e0b152",
    "#b1e052",
    "#52e052",
    "#52e0b1",
    "#52b1e0",
    "#5252e0",
    "#b152e0",
    "#e052b1",
]

export async function createNewGroup(this: Context, output: Output) {

    const color = defaultGroupColors[this.groups.list().length % defaultGroupColors.length];

    const group = this.groups.addNewGroup({ query: "", color })

    const groups = this.groups.list();

    output.presentNewGroup(group)
}