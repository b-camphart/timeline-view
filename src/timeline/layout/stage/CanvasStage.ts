import type {Scale} from "src/timeline/scale";
import type {TimelineItem} from "../../Timeline";
import {TimelineLayoutItem} from "./TimelineItemElement";

export type BackgroundColor = string | CanvasGradient | CanvasPattern;

export interface CanvasViewport {
	readonly width: number;
	readonly height: number;
}

export interface CanvasElement {
	readonly offsetTop: number;
	readonly offsetBottom: number;
	readonly offsetLeft: number;
	readonly offsetRight: number;
	readonly offsetCenterY: number;
	readonly offsetCenterX: number;
	readonly offsetWidth: number;
	readonly offsetHeight: number;

	readonly visible?: boolean;
	readonly backgroundColor: BackgroundColor | undefined;
	readonly borderColor: BackgroundColor | undefined;
	readonly strokeWidth: number | undefined;
}

export interface CanvasElementCollection extends Iterable<CanvasElement> {
	getCount(): number;
}

export {
	/** @deprecated import from "./layout" */
	layoutPoints,
} from "./layout";
