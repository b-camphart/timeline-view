import type { TFile } from "obsidian";
import type { TimelineItem } from "../../timeline/Timeline";
import type { FilePropertySelector } from "../properties/NotePropertySelector";

export class TimelineFileItem implements TimelineItem {

    constructor(
        public obsidianFile: TFile,
        private propertySelection: FilePropertySelector
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
}