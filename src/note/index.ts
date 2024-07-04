export interface Note {
	name(): string;
	created(): number;
	modified(): number;
	properties(): Record<string, any>;
}
