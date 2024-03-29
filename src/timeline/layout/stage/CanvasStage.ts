import type { TimelineItem } from "../../Timeline"

export function* renderStage(
    this: CanvasRenderingContext2D,
    viewport:{
        width: number,
        height: number,
        centerValue: number,
        scrollTop: number
    },
    point: {
        width: number,
        marginX: number,
        marginY: number
    },
    scale: { 
        toPixels(value: number): number,
        toValue(pixels: number): number
    },
    sortedItems: TimelineItem[],
) {
    const pointRadius = point.width / 2
    const PI2 = 2 * Math.PI
    const renderHeight = viewport.height + point.width

    const defaultColor = this.fillStyle;

    this.beginPath()
    this.clearRect(0, 0, viewport.width, viewport.height)

    const pointBounds = Array.from(layoutPoints(viewport, point, scale, sortedItems))
    let maxY = 0;
    for (const bounds of pointBounds) {
        if (bounds.bottom > maxY) maxY = bounds.bottom
    }

    const maxScroll = Math.max(0, (maxY + point.marginY) - viewport.height)
    if (viewport.scrollTop > maxScroll) viewport.scrollTop = maxScroll

    let currentColor = this.fillStyle;

    for (const bounds of pointBounds) {
        const scrolledY = bounds.centerY - viewport.scrollTop
        if (scrolledY < -point.width || scrolledY > renderHeight) continue

        const color = bounds.item.color() ?? defaultColor;

        if (color !== currentColor) {
            this.closePath();
            this.fill();
            this.beginPath();
        }

        this.fillStyle = color;

        this.moveTo(bounds.right, scrolledY)
        this.arc(bounds.centerX, scrolledY, pointRadius, 0, PI2)

        yield new PointBounds(bounds.centerX, scrolledY, bounds.item, point)
    }
    this.closePath()
    this.fill()
}

function* layoutPoints(
    viewport:{
        width: number,
        height: number,
        centerValue: number
    },
    point: {
        width: number,
        marginX: number,
        marginY: number
    },
    scale: { 
        toPixels(value: number): number,
        toValue(pixels: number): number
    },
    sortedItems: TimelineItem[],
) {

    const renderWidth = viewport.width + point.width
    // range within which, even if a point is slightly off screen, part of it would still be visible
    const visibleRange: [number, number] = [
        viewport.centerValue - scale.toValue(renderWidth / 2),
        viewport.centerValue + scale.toValue(renderWidth / 2),
    ]
    const leftOffset = Math.floor(viewport.width / 2) - scale.toPixels(viewport.centerValue)
    const pointRadius = Math.floor(point.width / 2)

    const lastXByRow: number[] = []

    let prev: { relativeLeftMargin: number, row: number, value: number } | undefined;

    for (const item of sortedItems) {
        if (item.value() > visibleRange[1]) continue;

        const absolutePixelCenter = scale.toPixels(item.value())
        const relativePixelCenter = absolutePixelCenter + leftOffset
        const relativeLeftMargin = (relativePixelCenter - pointRadius) - point.marginX

        let row: number
        if (relativeLeftMargin === prev?.relativeLeftMargin) {
            row = findNextAvailableRow(relativeLeftMargin, lastXByRow, prev.row)
        } else {
            row = findNextAvailableRow(relativeLeftMargin, lastXByRow)
        }

        const bounds = new PointBounds(
            relativePixelCenter, 
            (row * (point.width + point.marginY)) + pointRadius + point.marginY,
            item, 
            point
        )
        lastXByRow[row] = bounds.right

        prev = { relativeLeftMargin, row, value: item.value() }

        yield(bounds)
    }
}

function findNextAvailableRow(relativeLeftMargin: number, lastXByRow: number[], startIndex: number = 0) {
    for (let rowIndex = startIndex; rowIndex < lastXByRow.length; rowIndex++) {
        const x = lastXByRow[rowIndex]
        if (x < relativeLeftMargin) {
            return rowIndex
        }
    }
    
    return lastXByRow.length
}

export class PointBounds {

    constructor(
        public readonly centerX: number,
        public readonly centerY: number,
        public readonly item: TimelineItem,
        private readonly point: { readonly width: number }
    ) {}

    get x() { return this.centerX - (this.point.width / 2) }
    get y() { return this.centerY - (this.point.width / 2) }
    get left() { return this.x }
    get right() { return this.centerX + (this.point.width / 2) }
    get top() { return this.y }
    get bottom() { return this.centerY + (this.point.width / 2) }

    contains(x: number, y: number) {
        return this.x <= x && x < this.right &&
            this.y <= y && y < this.bottom
    }
}