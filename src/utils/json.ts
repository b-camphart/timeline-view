import {exists} from "./null";

export type Parser<T> = {
	parseOrDefault(data: unknown): T;
};

export type Checker<T> = {
	check(data: unknown): data is T;
};

export type Schema<T> = Parser<T> & Checker<T>;

// @eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Parsed<V extends Parser<T>, T = unknown> = ReturnType<
	V["parseOrDefault"]
>;

export function expectString(defaultValue: string): Schema<string> {
	return {
		parseOrDefault(data) {
			if (!this.check(data)) {
				return defaultValue;
			}
			return data;
		},
		check(data): data is string {
			return typeof data === "string";
		},
	};
}
export function expectNumber(defaultValue: number): Schema<number> {
	return {
		parseOrDefault(data) {
			if (!this.check(data)) {
				return defaultValue;
			}
			return data;
		},
		check(data): data is number {
			return typeof data === "number";
		},
	};
}
export function expectBoolean(defaultValue: boolean): Schema<boolean> {
	return {
		parseOrDefault(data) {
			if (!this.check(data)) {
				return defaultValue;
			}
			return data;
		},
		check(data): data is boolean {
			return typeof data === "boolean";
		},
	};
}

export function optional<T>(schema: Schema<T>): Schema<T | undefined> {
	return {
		parseOrDefault(data) {
			if (!this.check(data)) {
				return undefined;
			}
			return schema.parseOrDefault(data);
		},
		check(data): data is T {
			return typeof data === "undefined" || schema.check(data);
		},
	};
}

export function expectEnum<
	E extends Record<string | number | symbol, string | number>,
>(type: E, defaultValue: E[keyof E]): Schema<E[keyof E]> {
	const valueLookup = Object.fromEntries(
		Object.entries(type).map(([k, v]) => [v, k] as [E[keyof E], keyof E]),
	) as Record<E[keyof E], keyof E>;
	return {
		parseOrDefault(data) {
			if (!this.check(data)) {
				return defaultValue;
			}
			return data;
		},
		check(data): data is E[keyof E] {
			return (
				(typeof data === "string" || typeof data === "number") &&
				data in valueLookup
			);
		},
	};
}

export function expectArray<T>(
	schema: Schema<T>,
	options?: {
		length?: number;
	},
): Schema<T[]> {
	return {
		parseOrDefault(data) {
			if (!Array.isArray(data)) {
				return Array.from({length: options?.length ?? 0}, () =>
					schema.parseOrDefault(null),
				);
			}

			return data.map(it => schema.parseOrDefault(it));
		},
		check(data): data is T[] {
			return (
				Array.isArray(data) &&
				data.every(schema.check) &&
				(options?.length != null
					? data.length === options.length
					: true)
			);
		},
	};
}

export function expectObject<T extends object>(schema: {
	[K in keyof T]: Schema<T[K]>;
}): Schema<T> {
	return {
		parseOrDefault(data: unknown) {
			const obj = {} as T;
			if (typeof data !== "object" || data == null) {
				for (const [k, v] of Object.entries(schema)) {
					const key = k as keyof T;
					const value = v as Schema<T[typeof key]>;
					obj[key] = value.parseOrDefault(null);
				}
				return obj;
			}
			for (const [k, v] of Object.entries(schema)) {
				const key = k as keyof T;
				const value = v as Schema<T[typeof key]>;
				obj[key] = value.parseOrDefault(data[key as keyof typeof data]);
			}
			return obj;
		},
		check(data: unknown): data is T {
			if (typeof data !== "object" || data == null) {
				return false;
			}
			for (const [k, v] of Object.entries(schema)) {
				const key = k as keyof T;
				const value = v as Schema<T[typeof key]>;
				if (!value.check(data[key as keyof typeof data])) {
					return false;
				}
			}
			return true;
		},
	};
}

export function expectRecord<
	T extends Record<K, V>,
	K extends string | number | symbol,
	V,
>(schema: {key: Schema<K>; value: Schema<V>}): Schema<T> {
	return {
		parseOrDefault(data) {
			if (typeof data !== "object" || data == null) {
				return {} as T;
			}
			const validEntries = Object.entries(data)
				.map(([key, value]) => {
					if (!schema.key.check(key)) {
						return null;
					}
					return [key as K, schema.value.parseOrDefault(value)];
				})
				.filter(exists);
			return Object.fromEntries(validEntries) as T;
		},
		check(data): data is T {
			if (typeof data !== "object" || data == null) {
				return false;
			}
			return Object.entries(data).every(
				([key, value]) =>
					schema.key.check(key) && schema.value.check(value),
			);
		},
	};
}
