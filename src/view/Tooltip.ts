// eslint-disable-next-line
import _tooltipStyles from "./Tooltip.css";

type Tooltip = {
	visible: boolean;
	label: string;

	elementPosition?: (rect: DOMRect) => { x: number; y: number };
	mod?: "mod-top" | "mod-right" | "mod-left";
	className?: string;
	styles?: Partial<CSSStyleDeclaration>;
};
export function hoverTooltip(element: HTMLElement, args: Tooltip) {
	const tooltip = document.createElement("div");
	tooltip.className = "tooltip " + args.className + " " + (args.mod || "");

	tooltip.innerText = args.label;

	const tooltipArrow = document.createElement("div");
	tooltipArrow.className = "tooltip-arrow";
	tooltip.appendChild(tooltipArrow);

	function position({
		elementPosition = hoverTooltip.center,
		mod,
		styles,
	}: Tooltip) {
		const clientBounds = element.getBoundingClientRect();

		const relativePosition = elementPosition(clientBounds);

		const deltaX =
			mod === "mod-left"
				? -tooltipArrow.offsetWidth
				: mod === "mod-right"
					? tooltipArrow.offsetWidth
					: 0;
		const deltaY =
			mod === "mod-top"
				? -tooltipArrow.offsetHeight
				: mod === undefined
					? tooltipArrow.offsetHeight
					: 0;

		tooltip.setCssStyles({
			...styles,
			top: `${relativePosition.y + deltaY}px`,
			left: `${relativePosition.x + deltaX}px`,
		});
	}

	position(args);
	if (args.visible) {
		document.body.appendChild(tooltip);
	}

	let observer = new MutationObserver(() => position(args));
	observer.observe(element, { attributes: true });

	return {
		destroy() {
			observer.disconnect();
			tooltip.remove();
		},
		update(args: Tooltip) {
			tooltip.innerText = args.label;
			if (tooltipArrow.parentElement !== tooltip) {
				tooltip.appendChild(tooltipArrow);
			}
			tooltip.className =
				"tooltip " + args.className + " " + (args.mod || "");
			observer.disconnect();
			observer = new MutationObserver(() => position(args));
			observer.observe(element, { attributes: true });
			if (args.visible && tooltip.parentElement != document.body) {
				document.body.appendChild(tooltip);
			} else if (
				!args.visible &&
				tooltip.parentElement == document.body
			) {
				tooltip.remove();
			}
			position(args);
		},
	};
}
hoverTooltip.center = function (rect: DOMRect) {
	return {
		x: rect.x + rect.width / 2,
		y: rect.y + rect.height / 2,
	};
};
hoverTooltip.bottom = function (rect: DOMRect) {
	return {
		x: rect.x + rect.width / 2,
		y: rect.bottom,
	};
};
hoverTooltip.top = function (rect: DOMRect) {
	return {
		x: rect.x + rect.width / 2,
		y: rect.top,
	};
};
hoverTooltip.left = function (rect: DOMRect) {
	return {
		x: rect.left,
		y: rect.y + rect.height / 2,
	};
};
hoverTooltip.right = function (rect: DOMRect) {
	return {
		x: rect.right,
		y: rect.y + rect.height / 2,
	};
};
hoverTooltip.topLeft = function (rect: DOMRect) {
	return {
		x: rect.left,
		y: rect.top,
	};
};
hoverTooltip.topRight = function (rect: DOMRect) {
	return {
		x: rect.right,
		y: rect.top,
	};
};
hoverTooltip.bottomLeft = function (rect: DOMRect) {
	return {
		x: rect.left,
		y: rect.bottom,
	};
};
hoverTooltip.bottomRight = function (rect: DOMRect) {
	return {
		x: rect.right,
		y: rect.bottom,
	};
};
