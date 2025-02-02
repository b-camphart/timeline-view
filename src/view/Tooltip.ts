// eslint-disable-next-line
import _tooltipStyles from "./Tooltip.css";

type Tooltip = {
	visible: boolean;
	label: string;

	elementPosition?: (rect: DOMRect) => {x: number; y: number};
	className?: string;
	styles?: Partial<CSSStyleDeclaration>;
};
export function hoverTooltip(element: HTMLElement, args: Tooltip) {
	const tooltip = document.createElement("div");
	tooltip.className = "tooltip " + args.className;

	tooltip.innerText = args.label;

	const tooltipArrow = document.createElement("div");
	tooltipArrow.className = "tooltip-arrow";
	tooltip.appendChild(tooltipArrow);

	function position({elementPosition = hoverTooltip.center, styles}: Tooltip) {
		const clientBounds = element.getBoundingClientRect();

		const relativePosition = elementPosition(clientBounds);

		tooltip.setCssStyles({
			...styles,
			top: `${relativePosition.y}px`,
			left: `${relativePosition.x}px`,
		});
	}

	position(args);
	if (args.visible) {
		document.body.appendChild(tooltip);
	}

	let observer = new MutationObserver(() => position(args));
	observer.observe(element, {attributes: true});

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
			tooltip.className = "tooltip " + args.className;
			position(args);
			observer.disconnect();
			observer = new MutationObserver(() => position(args));
			observer.observe(element, {attributes: true});
			if (args.visible && tooltip.parentElement != document.body) {
				document.body.appendChild(tooltip);
			} else if (!args.visible && tooltip.parentElement == document.body) {
				tooltip.remove();
			}
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
