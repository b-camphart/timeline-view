import type { Action } from "svelte/action";

/** a svelte action that creates a tooltip for the supplied element */
export const tooltip: Action<
	HTMLElement,
	{ clientX: number; clientY: number; label: string }
> = function (_element, props) {
	const { clientX, clientY, label } = props;
	const tooltipEl = document.createElement("div");
	tooltipEl.className = "tooltip";
	document.body.appendChild(tooltipEl);

	tooltipEl.innerText = label;

	const tooltipArrow = document.createElement("div");
	tooltipArrow.className = "tooltip-arrow";
	tooltipEl.appendChild(tooltipArrow);

	tooltipEl.setCssStyles({
		translate: `0 ${tooltipArrow.offsetHeight}px`,
		top: `${clientY}px`,
		left: `${clientX}px`,
	});
	return {
		destroy() {
			tooltipEl.remove();
		},
		update(props) {
			const { clientX, clientY, label } = props;
			tooltipEl.innerText = label;
			tooltipEl.setCssStyles({
				top: `${clientY}px`,
				left: `${clientX}px`,
			});
		},
	};
};
