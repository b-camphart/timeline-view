import type {CanvasElement, CanvasElementCollection, CanvasViewport} from "src/timeline/layout/stage/CanvasStage";

export type Context = Pick<
	CanvasRenderingContext2D,
	"fillStyle" | "strokeStyle" | "lineWidth" | "beginPath" | "closePath" | "fill" | "stroke" | "roundRect" | "moveTo"
>;

export function renderLayout(
	context: CanvasRenderingContext2D,
	viewport: CanvasViewport,
	layout: CanvasElementCollection,
	dragPreview: CanvasElementCollection | null,
) {
	context.beginPath();
	context.clearRect(0, 0, viewport.width, viewport.height);

	batchRenderItems(context, viewport, layout);
	if (dragPreview != null && dragPreview.getCount() > 0) {
		batchRenderItems(context, viewport, dragPreview);
	}
}

export function batchRenderItems(context: Context, viewport: CanvasViewport, items: CanvasElementCollection) {
	const batches = new Map<string, CanvasElement[]>();

	const defaultColor = context.fillStyle;
	const defaultBorderColor = context.strokeStyle;
	const defaultStrokeWidth = 0;
	for (const item of items) {
		if (
			item.visible === false ||
			item.offsetTop > viewport.height ||
			item.offsetBottom < 0 ||
			item.offsetLeft > viewport.width ||
			item.offsetRight < 0
		)
			continue;

		const key = `${item.backgroundColor ?? defaultColor}|${item.borderColor ?? defaultBorderColor}|${
			item.strokeWidth ?? defaultStrokeWidth
		}`;

		if (!batches.has(key)) {
			batches.set(key, []);
		}
		batches.get(key)!.push(item);
	}

	// let currentBorderColor = defaultBorderColor;
	// let currentFillColor = defaultColor;
	// let currentStrokeWidth = 2;

	for (const entry of batches) {
		const [backgroundColor, borderColor, strokeWidth] = entry[0].split("|");
		context.fillStyle = backgroundColor;
		context.strokeStyle = borderColor;
		context.lineWidth = Number.parseFloat(strokeWidth);

		context.beginPath();
		for (let i = 0; i < entry[1].length; i++) {
			context.roundRect(
				entry[1][i].offsetLeft,
				entry[1][i].offsetTop,
				entry[1][i].offsetWidth,
				entry[1][i].offsetHeight,
				entry[1][i].offsetHeight / 2,
			);
		}

		context.fill();
		if (context.lineWidth > 0) {
			context.stroke();
		}
	}
}

export function renderItemsSequentially(context: Context, viewport: CanvasViewport, items: CanvasElementCollection) {
	const defaultBorderColor = context.strokeStyle;
	const defaultColor = context.fillStyle;
	const defaultStrokeWidth = 0;

	let currentBorderColor = defaultBorderColor;
	let currentFillColor = defaultColor;
	let currentStrokeWidth = 2;

	context.beginPath();

	for (const item of items) {
		if (item.visible === false) continue;
		if (item.offsetTop > viewport.height || item.offsetBottom < 0) continue;
		if (item.offsetLeft > viewport.width || item.offsetRight < 0) continue;

		const color = item.backgroundColor ?? defaultColor;
		const borderColor = item.borderColor ?? defaultBorderColor;
		const strokeWidth = item.strokeWidth ?? defaultStrokeWidth;

		if (color !== currentFillColor || borderColor !== currentBorderColor || strokeWidth !== currentStrokeWidth) {
			context.fill();
			if (currentStrokeWidth > 0) {
				context.stroke();
			}
			context.beginPath();

			context.fillStyle = color;
			currentFillColor = color;

			context.strokeStyle = borderColor;
			currentBorderColor = borderColor;

			context.lineWidth = strokeWidth;
			currentStrokeWidth = strokeWidth;
		}

		context.moveTo(item.offsetRight, item.offsetTop);
		context.roundRect(item.offsetLeft, item.offsetTop, item.offsetWidth, item.offsetHeight, item.offsetHeight / 2);
	}
	context.closePath();
	context.fill();
	if (currentStrokeWidth > 0) {
		context.stroke();
	}
}
