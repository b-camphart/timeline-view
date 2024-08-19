export interface Colored {
	color(): string;
}

export interface Colorable {
	recolor(color: string): void;
}

export interface ColoredColorable extends Colored, Colorable {}
