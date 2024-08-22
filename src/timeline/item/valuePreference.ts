export interface NumberPreference {
	prefersIntegers: () => boolean;
	prefersFloats: () => boolean;
}

export interface NumberPreferenceWriter {
	useIntegers(): void;
	useFloats(): void;
}

export type NumberPreferenceReaderWriter = NumberPreference &
	NumberPreferenceWriter & {
		canBeChanged(): boolean;
	};

export abstract class TimelineItemValueProperty
	implements NumberPreferenceReaderWriter
{
	constructor(name: string) {
		this.#name = name;
	}

	#name;
	name() {
		return this.#name;
	}

	abstract prefersIntegers(): boolean;
	abstract prefersFloats(): boolean;
	abstract useIntegers(): void;
	abstract useFloats(): void;
	abstract canBeChanged(): boolean;
	sanitizeValue(value: number): number {
		if (this.prefersIntegers()) {
			return Math.round(value);
		}
		return value;
	}

	static get Number() {
		return TimelineItemNumberProperty;
	}
	static get Date() {
		return TimelineItemDateProperty;
	}
}

export class TimelineItemNumberProperty extends TimelineItemValueProperty {
	#savePreference;

	constructor(
		name: string,
		savePreference: (name: string, preferInts: boolean) => void,
		preferInts?: boolean,
	) {
		super(name);
		this.#savePreference = savePreference;
		this.#preferInts = preferInts ?? true;
	}

	#preferInts;

	prefersIntegers() {
		return this.#preferInts;
	}

	useIntegers() {
		this.#preferInts = true;
		this.#savePreference(this.name(), this.#preferInts);
	}

	prefersFloats(): boolean {
		return !this.#preferInts;
	}

	useFloats(): void {
		this.#preferInts = false;
		this.#savePreference(this.name(), this.#preferInts);
	}

	canBeChanged(): boolean {
		return true;
	}

	sanitizeValue(value: number): number {
		if (this.prefersIntegers()) {
			return Math.round(value);
		}
		return value;
	}
}

export class TimelineItemDateProperty extends TimelineItemValueProperty {
	constructor(name: string) {
		super(name);
	}

	prefersIntegers(): boolean {
		return true;
	}

	prefersFloats(): boolean {
		return false;
	}

	useFloats(): void {}

	useIntegers(): void {}

	canBeChanged(): boolean {
		return false;
	}

	sanitizeValue(value: number): number {
		return Math.round(value);
	}
}
