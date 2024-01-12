import type { TimelineItem } from "src/timeline/Timeline";
import type { TimelineFileItem } from "../../TimelineFileItem";
import type { ItemGroup } from "./FileGroup";
import { applyFileToGroup } from "./applyFilesToGroup";
import { recolorGroup } from "./recolorGroup";
import { removeGroup } from "./removeGroup";
import { listExistingGroups } from "./listExistingGroups";
import { createNewGroup } from "./createNewGroup";
import { reorderGroup } from "./reorderGroup";

export interface TimelineItemGroups {
    listGroups(): readonly ItemGroup[];
    applyFileToGroup(groupId: string, query: string): void;
    recolorGroup(groupId: string, color: string): void;
    removeGroup(groupId: string): void;
    reorderGroup(groupId: string, toIndex: number): void;
    createNewGroup(): void;
}

interface Context {
    recolorProcess: { stop(): void } | undefined;

    readonly groups: {
        getGroup(groupId: string): ItemGroup | undefined;
        saveGroup(group: ItemGroup): void;
        removeGroup(groupId: string): boolean;
        list(): readonly ItemGroup[];
        addNewGroup(data: { query: string, color: string }): ItemGroup;
        getOrder(): readonly string[];
        setOrder(order: readonly string[]): void;
    }

    readonly items: {
        list(): readonly TimelineFileItem[];
    }
}

export type { Context as TimelineItemGroupsContext }

interface Output {
    presentNewGroup(group: ItemGroup): void;
    presentReorderedGroups(groups: readonly ItemGroup[]): void;
    presentRequeriedGroup(group: ItemGroup): void;
    presentRecoloredItem(item: TimelineItem): void;
    presentRecoloredItems(items: TimelineItem[]): void;
    presentRecoloredGroup(group: ItemGroup): void;
    hideGroup(groupId: string): void;
}

export type { Output as TimelineItemGroupsOutput }


export function makeTimelineItemGroups(
    context: Context,
    output: Output
): TimelineItemGroups {
     return new TimelineItemGroupsImpl(
        context, 
        output
    );
}

class TimelineItemGroupsImpl implements TimelineItemGroups {

    constructor(
        private context: Context,
        private output: Output,
    ) {}

    createNewGroup(): void {
        createNewGroup.call(this.context, this.output)
    }

    applyFileToGroup(groupId: string, query: string): void {
        applyFileToGroup.call(this.context, groupId, query, this.output);
    }
    
    recolorGroup(groupId: string, color: string): void {
        recolorGroup.call(this.context, groupId, color, this.output);
    }
    
    removeGroup(groupId: string): void {
        removeGroup.call(this.context, groupId, this.output);
    }
    
    reorderGroup(groupId: string, toIndex: number): void {
        reorderGroup.call(this.context, groupId, toIndex, this.output)
    }

    listGroups(): readonly ItemGroup[] {
        let receivedGroups: readonly ItemGroup[] = []
        listExistingGroups.call(this.context, {
            presentGroups(groups) {
                receivedGroups = groups
            },
        })

        return receivedGroups
    }

}