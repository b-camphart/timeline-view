export interface Scale {
	toPixels(value: number): number;
	toValue(pixels: number): number;
}

export class ValuePerPixelScale implements Scale {
	constructor(readonly valuePerPixel: number) {}

	toPixels(value: number): number {
		return Math.floor(value / this.valuePerPixel);
	}

	toValue(pixels: number): number {
		return pixels * this.valuePerPixel;
	}
}
