export interface Colored {
	color(): string;
}

export interface Colorable {
	recolor(color: string): void;
}

export interface ColoredColorable extends Colored, Colorable {}

let context: CanvasRenderingContext2D | undefined;
export function parseColor(color: string) {
	context ??= document
		.createElement("canvas")
		.getContext("2d", { willReadFrequently: true })!;
	context.clearRect(0, 0, 1, 1);
	context.fillStyle = color;
	context.fillRect(0, 0, 1, 1);
	const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
	return { r, g, b, a: a / 255 }; // Normalize alpha
}

export function blendColors(
	color: string,
	overlay: { r: number; g: number; b: number; a: number },
) {
	const base = parseColor(color);

	const alphaOut = overlay.a + base.a * (1 - overlay.a);
	const r = Math.round(
		(overlay.r * overlay.a + base.r * base.a * (1 - overlay.a)) / alphaOut,
	);
	const g = Math.round(
		(overlay.g * overlay.a + base.g * base.a * (1 - overlay.a)) / alphaOut,
	);
	const b = Math.round(
		(overlay.b * overlay.a + base.b * base.a * (1 - overlay.a)) / alphaOut,
	);

	return `rgba(${r}, ${g}, ${b}, ${alphaOut.toFixed(3)})`;
}

export class OverlayColor {
	#parsed;
	constructor(readonly color: string) {
		this.#parsed = parseColor(color);
		if (this.#parsed.a === 0) {
			this.blend = OverlayColor.#noop;
		} else if (this.#parsed.a === 1) {
			this.blend = this.#replace;
		} else {
			this.blend = this.#blend;
		}
	}

	blend: (color: string) => string;

	#replace() {
		return this.color;
	}

	static #noop(color: string) {
		return color;
	}

	#blended = new Map<string, string>();
	#blend(color: string) {
		const cached = this.#blended.get(color);
		if (cached) {
			return cached;
		}
		const result = blendColors(color, this.#parsed);
		this.#blended.set(color, result);
		return result;
	}
}
