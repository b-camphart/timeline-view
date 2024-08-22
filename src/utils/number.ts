export function truncate(value: number | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    return Math.trunc(value);
}