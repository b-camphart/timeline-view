import type { TFile } from "obsidian";
import type { TimelineItem } from "../../timeline/Timeline";
import type { FilePropertySelector } from "../properties/NotePropertySelector";

export class TimelineFileItem implements TimelineItem {

    constructor(
        public file: TFile,
        private propertySelection: FilePropertySelector
    ) {}
    
    id(): string {
        return this.file.path
    }
    
    value(): number {
        return this.propertySelection.selectProperty(this.file)
    }

    name(): string {
        return this.file.basename;
    }
}