import type { TimelineItem } from "../../timeline/Timeline";
import type { FilePropertySelector } from "./settings/property/NotePropertySelector";
import type { ItemGroup } from "./settings/groups/FileGroup";
import type { Note } from "../files/Note";

export class TimelineFileItem implements TimelineItem {

    private _group: ItemGroup | undefined;

    constructor(
        public obsidianFile: Note,
        private propertySelection: FilePropertySelector,
    ) {
    }
    
    id(): string {
        return this.obsidianFile.path()
    }
    
    value(): number {
        return this.propertySelection.selectProperty(this.obsidianFile)
    }

    name(): string {
        return this.obsidianFile.nameWithoutExtension();
    }

    applyGroup(group: ItemGroup | undefined) {
        this._group = group
    }

    color(): string | undefined {
        return this._group?.color
    }

    group(): string | undefined {
        return this._group?.id
    }

    forgetGroup(): void {
        this._group = undefined;
    }

}