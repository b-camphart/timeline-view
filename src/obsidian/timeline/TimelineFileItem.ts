import type { TFile } from "obsidian";
import type { TimelineItem } from "../../timeline/Timeline";
import type { FilePropertySelector } from "../properties/NotePropertySelector";
import type { ColorSelector, ItemGroup } from "./settings/groups/FileGroup";

export class TimelineFileItem implements TimelineItem {

    private _group: ItemGroup | undefined;

    constructor(
        public obsidianFile: TFile,
        private propertySelection: FilePropertySelector,
    ) {
    }
    
    id(): string {
        return this.obsidianFile.path
    }
    
    value(): number {
        return this.propertySelection.selectProperty(this.obsidianFile)
    }

    name(): string {
        return this.obsidianFile.basename;
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