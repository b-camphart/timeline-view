import type { TFile } from "obsidian";
import type { TimelineItem } from "../../timeline/Timeline";
import type { FilePropertySelector } from "../properties/NotePropertySelector";
import type { ColorSelector } from "./settings/groups/FileGroup";

export class TimelineFileItem implements TimelineItem {

    constructor(
        public obsidianFile: TFile,
        private propertySelection: FilePropertySelector,
        private colorSelection: ColorSelector,

    ) {}
    
    id(): string {
        return this.obsidianFile.path
    }
    
    value(): number {
        return this.propertySelection.selectProperty(this.obsidianFile)
    }

    name(): string {
        return this.obsidianFile.basename;
    }

    color(): string | undefined {
        return this.colorSelection.selectColor(this.obsidianFile);
    }

    invalidateColor() {
        this.colorSelection.invalidate(this.obsidianFile.path)
    }
}