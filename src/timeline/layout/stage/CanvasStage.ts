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
	readonly offsetWidth: number;
	readonly offsetHeight: number;

	readonly visible?: boolean;
	readonly backgroundColor: BackgroundColor | undefined;
	readonly borderColor: BackgroundColor | undefined;
	readonly strokeWidth: number | undefined;
}

export {
	/** @deprecated import from "./layout" */
	layoutPoints,
} from "./layout";
