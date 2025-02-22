import type {
	CanvasElement,
	CanvasViewport,
} from "src/timeline/layout/stage/CanvasStage";

export type Context = Pick<
	CanvasRenderingContext2D,
	| "fillStyle"
	| "strokeStyle"
	| "lineWidth"
	| "beginPath"
	| "closePath"
	| "fill"
	| "stroke"
	| "roundRect"
	| "moveTo"
	| "rect"
	| "globalCompositeOperation"
>;

export function renderLayout(
	context: CanvasRenderingContext2D,
	viewport: CanvasViewport,
	radius: number,
	layout: readonly CanvasElement[],
	dragPreview: readonly CanvasElement[] | null,
) {
	context.beginPath();
	context.clearRect(0, 0, viewport.width, viewport.height);

	renderItemsSequentially(context, viewport, layout, radius);
	if (dragPreview != null && dragPreview.length > 0) {
		renderItemsSequentially(context, viewport, dragPreview, radius);
	}
}

export function batchRenderItems(
	context: Context,
	viewport: CanvasViewport,
	items: readonly CanvasElement[],
) {
	const batches = new Map<string, CanvasElement[]>();

	const defaultColor = context.fillStyle;
	const defaultBorderColor = context.strokeStyle;
	const defaultStrokeWidth = 0;
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
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

export function renderItemsSequentially(
	context: Context,
	viewport: CanvasViewport,
	items: readonly CanvasElement[],
	radius: number,
) {
	const defaultBorderColor = context.strokeStyle;
	const defaultColor = context.fillStyle;
	const defaultStrokeWidth = 0;

	let currentBorderColor = defaultBorderColor;
	let currentFillColor = defaultColor;
	let currentStrokeWidth = 2;

	const drawItem =
		radius === 0
			? (item: CanvasElement) => {
					context.rect(
						item.offsetLeft,
						item.offsetTop,
						item.offsetWidth,
						item.offsetHeight,
					);
				}
			: (item: CanvasElement) => {
					context.roundRect(
						item.offsetLeft,
						item.offsetTop,
						item.offsetWidth,
						item.offsetHeight,
						radius,
					);
				};

	context.globalCompositeOperation = "source-over";
	context.beginPath();

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (item.visible === false) continue;
		if (item.offsetTop > viewport.height || item.offsetBottom < 0) continue;
		if (item.offsetLeft > viewport.width || item.offsetRight < 0) continue;

		const color = item.backgroundColor ?? defaultColor;
		const borderColor = item.borderColor ?? defaultBorderColor;
		const strokeWidth = item.strokeWidth ?? defaultStrokeWidth;

		if (
			color !== currentFillColor ||
			borderColor !== currentBorderColor ||
			strokeWidth !== currentStrokeWidth
		) {
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

		drawItem(item);
	}
	context.closePath();
	context.fill();
	if (currentStrokeWidth > 0) {
		context.stroke();
	}

	// draw lines within items with durations
	context.globalCompositeOperation = "destination-out";
	context.beginPath();
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (item.visible === false) continue;
		if (item.offsetTop > viewport.height || item.offsetBottom < 0) continue;
		if (item.offsetLeft > viewport.width || item.offsetRight < 0) continue;
		// don't add duration line to items without duration
		if (item.offsetHeight === item.offsetWidth) continue;

		context.rect(
			item.offsetLeft + radius,
			item.offsetTop + (radius - 1),
			item.offsetWidth - radius * 2,
			2,
		);
	}
	context.fill();
}
