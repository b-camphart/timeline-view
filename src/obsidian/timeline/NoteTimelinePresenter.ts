import type Timeline from "src/timeline/Timeline.svelte";

export class NoteTimelinePresenter {

    constructor(

    ) {

    }

    mounted(
        timeline: Timeline
    ) {
        timeline.zoomToFit()
    }

}