import type { Reactive } from "src/svelte/reactive";
import { DisplayType } from "src/timeline/ruler/labels";
import { untrack } from "svelte";

const enum Type {
	Number = "number",
	Date = "date",
	DateTime = "datetime",
}
export { Type as TimelinePropertyType };
export function timelinePropertyType(from: string) {
	switch (from) {
		case "number":
			return Type.Number;
		case "date":
			return Type.Date;
		case "datetime":
			return Type.DateTime;
	}
	return null;
}

export class TimelineProperty {
	constructor(readonly name: string, type: Type, usesInts: boolean) {
		this.#type = type;
		this.#usesInts = usesInts;
		if (type === Type.Number) {
			this.#changePreference = this.#useInts;
		}
	}

	#type = $state(Type.Number);
	type() {
		return this.#type;
	}
	#setType(type: Type) {
		this.#type = type;

		if (type === Type.Number) {
			this.#changePreference = this.#useInts;
		} else {
			this.#changePreference = null;
		}
	}

	#usesInts = $state(true);
	/** what the property actually uses */
	usesInts() {
		return this.#type !== Type.Number || this.#usesInts;
	}
	/** the preference the user has set */
	prefersInts() {
		return this.#usesInts;
	}

	#useInts(useInts: boolean) {
		this.#usesInts = useInts;
	}

	#changePreference = $state<null | ((useInts: boolean) => void)>(null);
	get useInts() {
		return this.#changePreference;
	}

	static setType(property: TimelineProperty, type: Type) {
		if (
			property === TimelineProperty.Created ||
			property === TimelineProperty.Modified
		) {
			return;
		}
		property.#setType(type);
	}

	displayedAs() {
		if (this.#type === Type.Number) {
			return DisplayType.Numeric;
		}
		return DisplayType.Date;
	}

	valueOrNull(from: {
		created: number;
		modified: number;
		properties: Record<string, unknown>;
	}): number | null {
		if (this === TimelineProperty.Created) return from.created;
		if (this === TimelineProperty.Modified) return from.modified;
		const value = from.properties[this.name];
		if (value == null) return null;
		if (typeof value === "number") return value;
		if (typeof value === "string") {
			const datetime = window.moment(value);
			if (datetime.isValid()) {
				return datetime.valueOf();
			}
			const parsed = parseFloat(value);
			if (!isNaN(parsed)) return parsed;
			return null;
		}
		return null;
	}

	sanitizeValue(value: number) {
		if (this.usesInts()) return Math.round(value);
		return value;
	}

	createItem(value: number) {
		if (this === TimelineProperty.Created) return { created: value };
		if (this === TimelineProperty.Modified) return { modified: value };
		return {
			properties: {
				[this.name]: this.sanitizeValue(value),
			},
		};
	}

	static Number(name: string, usesInts: boolean) {
		return new TimelineProperty(name, Type.Number, usesInts);
	}

	static Date(name: string, usesInts: boolean) {
		return new TimelineProperty(name, Type.Date, usesInts);
	}

	static DateTime(name: string, usesInts: boolean) {
		return new TimelineProperty(name, Type.DateTime, usesInts);
	}

	static Created = TimelineProperty.DateTime("created", true);
	static Modified = TimelineProperty.DateTime("modified", true);
}

export interface ObservableTimelineProperty {
	readonly name: string;
	readonly type: Reactive<Type>;
	readonly usesInts: Reactive<boolean>;

	/** `null` if the property cannot be changed */
	readonly useInts: null | ((useInts: boolean) => void);
}

TimelineProperty.prototype satisfies ObservableTimelineProperty;

export class TimelineProperties {
	#primary = $state<TimelineProperty>(TimelineProperty.Created);

	primary() {
		return this.#primary;
	}

	onPrimaryPropertyChanged: null | (() => void) = null;
	setPrimaryProperty(property: TimelineProperty) {
		this.#primary = property;
		this.onPrimaryPropertyChanged?.();
	}

	#secondaryProperty = $state<TimelineProperty>(TimelineProperty.Modified);
	#secondaryInterpretation = $state<"length" | "end">("length");
	#secondaryPropertyInUse = $state(false);

	enableSecondaryProperty(enabled: boolean = true) {
		this.#secondaryPropertyInUse = enabled;
	}

	disableSecondaryProperty(disabled: boolean = true) {
		this.#secondaryPropertyInUse = !disabled;
	}

	secondary() {
		if (!this.#secondaryPropertyInUse) return null;
		return {
			property: () => {
				return this.#secondaryProperty;
			},
			setProperty: (property: TimelineProperty) => {
				this.#secondaryProperty = property;
			},
			interpretedAs: () => {
				return this.#secondaryInterpretation;
			},
			interpretAs: (interpretation: "length" | "end") => {
				this.#secondaryInterpretation = interpretation;
			},
		};
	}

	async options() {
		const primary = untrack(() => this.#primary);
		const secondary = untrack(() => this.#secondaryProperty);

		for (const knownProperty of await this.refresh()) {
			const name = knownProperty.name();
			const type = timelinePropertyType(knownProperty.type());
			const existingIndex = this.properties.findIndex(
				(p) => p.name === knownProperty.name()
			);
			if (existingIndex >= 0) {
				const existing = this.properties[existingIndex];
				if (type === null) {
					this.properties.splice(existingIndex, 1);
					if (primary === existing) {
						this.#primary = TimelineProperty.Created;
					}
					if (secondary === existing) {
						this.#secondaryProperty = TimelineProperty.Modified;
					}
				} else {
					TimelineProperty.setType(existing, type);
				}
			} else {
				if (type === null) continue;
				if (type === Type.Number) {
					this.properties.push(TimelineProperty.Number(name, true));
				} else if (type === Type.Date) {
					this.properties.push(TimelineProperty.Date(name, true));
				} else {
					this.properties.push(TimelineProperty.DateTime(name, true));
				}
			}
		}
		return this.properties;
	}

	/**
	 * @type {Reactive}
	 */
	saveState() {
		const preferences: Record<string, false> = {};
		for (const property of this.properties) {
			if (
				property === TimelineProperty.Created ||
				property === TimelineProperty.Modified
			)
				continue;
			if (property.prefersInts()) continue;
			preferences[property.name] = false;
		}

		return {
			property: this.#primary.name,
			propertiesUseWholeNumbers: preferences,
			secondaryProperty: {
				name: this.#secondaryProperty.name,
				inUse: this.#secondaryPropertyInUse,
				useAs: this.#secondaryInterpretation,
			},
		};
	}

	createItem(value: number) {
		return this.#primary.createItem(value);
	}

	static async make(
		knownProperties: () => Promise<
			{
				name(): string;
				type(): string;
			}[]
		>,
		property: string,
		propertiesUseWholeNumbers: Record<string, boolean>,
		secondaryProperty: {
			name: string;
			inUse: boolean;
			useAs: "length" | "end";
		}
	) {
		const properties = [
			TimelineProperty.Created,
			TimelineProperty.Modified,
		];
		for (const knownProperty of await knownProperties()) {
			const name = knownProperty.name();
			const useInts = propertiesUseWholeNumbers[name] ?? true;
			const type = timelinePropertyType(knownProperty.type());
			let property;
			switch (type) {
				case Type.Number:
					property = TimelineProperty.Number(name, useInts);
					break;
				case Type.Date:
					property = TimelineProperty.Date(name, useInts);
					break;
				case Type.DateTime:
					property = TimelineProperty.DateTime(name, useInts);
					break;
				default:
					console.warn(
						`[Timeline View] Unknown property type: ${type}`
					);
					continue;
			}

			properties.push(property);
		}

		const primary =
			properties.find((p) => p.name === property) ??
			TimelineProperty.Created;
		const secondary =
			properties.find((p) => p.name === secondaryProperty.name) ??
			TimelineProperty.Modified;

		return new TimelineProperties(
			knownProperties,
			properties,
			primary,
			secondary,
			secondaryProperty.useAs,
			secondaryProperty.inUse
		);
	}

	private constructor(
		private refresh: () => Promise<
			{
				name(): string;
				type(): string;
			}[]
		>,
		private properties: TimelineProperty[],
		primary: TimelineProperty,
		secondary: TimelineProperty,
		secondaryInterpretation: "length" | "end",
		secondaryPropertyInUse: boolean
	) {
		this.#primary = primary;
		this.#secondaryProperty = secondary;
		this.#secondaryInterpretation = secondaryInterpretation;
		this.#secondaryPropertyInUse = secondaryPropertyInUse;
	}
}

export interface ObservableTimelineProperties<
	Property extends ObservableTimelineProperty = ObservableTimelineProperty
> {
	readonly primary: Reactive<Property>;

	setPrimaryProperty(property: Property): void;

	/** `null` if no secondary property is in use */
	readonly secondary: Reactive<null | {
		readonly property: Reactive<Property>;

		setProperty(property: Property): void;

		readonly interpretedAs: Reactive<"length" | "end">;

		interpretAs(interpretation: "length" | "end"): void;
	}>;

	disableSecondaryProperty(disabled?: boolean): void;
	enableSecondaryProperty(enabled?: boolean): void;

	options(): Promise<Property[]>;
}

TimelineProperties.prototype satisfies ObservableTimelineProperties;
