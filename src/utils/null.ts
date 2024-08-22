export function exists<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined;
}

export function doesNotExist<T>(
	value: T | null | undefined,
): value is null | undefined {
	return value === null || value === undefined;
}
