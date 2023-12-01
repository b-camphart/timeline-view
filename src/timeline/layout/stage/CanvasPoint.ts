export function absolutePosition(
    scale: { toPixels(value: number): number },
    value: number
) {
    return scale.toPixels(value)
}

export function CanvasPoint(
    this: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
) {
    this.ellipse(x, y, radius, radius, 0, 0, 0)
}