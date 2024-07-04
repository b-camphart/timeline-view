export interface Note {
	id(): string;
	name(): string;
	created(): number;
	modified(): number;
	properties(): Record<string, any>;
}
