import { get, type Writable } from "svelte/store";
import type { ItemGroup } from "./FileGroup";
import { type FileFilter } from "obsidian-search";
import type { TimelineItemGroupsContext } from "./Groups";
import type { Files } from "src/obsidian/files/Files";

export interface GroupSection {
    readonly collapsed: Writable<boolean>
}

type StoredGroup = { query: string, color: string };

type TimelineItemGroupsRepo = TimelineItemGroupsContext["groups"]

export class GroupRepository implements TimelineItemGroupsRepo {

    private order: string[] = []
    private groups = new Map<string, ItemGroup>();
    private nextId: number;

    constructor(
        private storedGroups: Writable<StoredGroup[]>,
        private files: Files
    ) {
        get(storedGroups).forEach((storedGroup, index) => {
            const id = index.toString();
            const group = new TimelineFileItemGroup(id, files, storedGroup)
            this.groups.set(id, group)
        })

        this.nextId = this.groups.size;
    }

    getOrder(): readonly string[] {
        return this.order
    }

    addNewGroup(data: StoredGroup): ItemGroup {
        this.nextId++;
        const group = new TimelineFileItemGroup(this.nextId.toString(), this.files, data)
        this.groups.set(group.id, group)
        this.order.push(group.id)
        this.storedGroups.update(currentStoredGroups => {
            currentStoredGroups.push(data)
            return currentStoredGroups
        })
        return group
    }

    getGroup(groupId: string): ItemGroup | undefined {
        return this.groups.get(groupId)
    }

    saveGroup(groupToSave: ItemGroup): void {
        if (this.groups.has(groupToSave.id)) {
            this.storedGroups.update(() => {
                return this.order.map(id => this.groups.get(id)!)
            })
        }
    }

    removeGroup(groupId: string): boolean {
        if (this.groups.has(groupId)) {
            this.groups.delete(groupId)
            this.order.splice(this.order.indexOf(groupId), 1)
            this.storedGroups.update(() => {
                return this.order.map(id => this.groups.get(id)!)
            })
            return true;
        }
        return false;
    }

    setOrder(order: readonly string[]) {
        this.order = [...order]
    }

    list(): readonly ItemGroup[] {
        return this.order.map(id => this.groups.get(id)!)
    }

}

class TimelineFileItemGroup implements ItemGroup {

    private _filter: FileFilter;
    private _query: string;
    public color: string;

    constructor(
        public id: string,
        private files: Files,
        from: StoredGroup,
    ) {
        this.color = from.color
        this._query = from.query
        this._filter = files.parseFilter(from.query)
    }

    get query() {
        return this._query
    }

    set query(query: string) {
        this._query = query
        this._filter = this.files.parseFilter(query)
    }

    get filter() {
        return this._filter
    }

}