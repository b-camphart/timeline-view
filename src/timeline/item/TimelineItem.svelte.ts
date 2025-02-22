type Reactive<T> = () => T;

type Identified = { readonly id: string };
type Named = { name: Reactive<string> };
type Colored = { color: Reactive<string | undefined> };

export type TimelineItemSource = Identified & Named & Colored;

class TimelineItem<T extends TimelineItemSource> {
	constructor(public source: T) {}
	get id() {
		return this.source.id;
	}

	name() {
		return this.source.name();
	}

	color() {
		return this.source.color();
	}

	#startValue: number = $state(0);
	startValue() {
		return this.#startValue;
	}
	setStartValue(startValue: number) {
		this.#startValue = startValue;
	}
	#length: number = $state(0);
	length() {
		return this.#length;
	}
	setLength(length: number) {
		this.#length = length;
	}
}
export { type TimelineItem };
export function timelineItem<T extends TimelineItemSource>(source: T) {
	return new TimelineItem<T>(source);
}
