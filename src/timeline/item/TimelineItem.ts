type Reactive<T> = () => T;

type Identified = {readonly id: string};
type Named = {name: Reactive<string>};
type Colored = {color: Reactive<string | undefined>};

export type TimelineItemSource<T> = T & Identified & Named & Colored;

class TimelineItem<T> {
	constructor(public source: TimelineItemSource<T>) {}
	get id() {
		return this.source.id;
	}

	name() {
		return this.source.name();
	}

	color() {
		return this.source.color();
	}

	value: number = 0;
	length: number = 0;
}
export {type TimelineItem};
export function timelineItem<T>(source: TimelineItemSource<T>) {
	return new TimelineItem<T>(source);
}
