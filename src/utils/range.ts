export function* range(count: number): Iterable<number> {
	for (let i = 0; i < count; i++) {
		yield i;
	}
}
