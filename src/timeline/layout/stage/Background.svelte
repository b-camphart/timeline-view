<div class="timeline-view--plotarea-background"></div>

<style>
	div {
		pointer-events: none;
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
	}
	.timeline-view--plotarea-background {
		/** draw horizontal lines */
		--line-color: var(--background-line-color);
		--line-width: var(--background-line-width);
		--gap: var(--item-cross-axis-spacing);

		background: linear-gradient(
			var(--line-color),
			var(--line-color) var(--line-width),
			transparent var(--line-width),
			transparent
		);
		background-size: 100% var(--gap);

		/** prevents lines from appearing above items in the plot area */
		--start-y: calc(var(--item-size) / 2);
		--top-offset: calc(
			var(--padding-top) + var(--item-margin-top) -
				var(--cross-axis-scroll)
		);
		--top: max(0px, var(--top-offset));
		top: var(--top);
		background-position-y: calc(
			var(--start-y) + var(--top-offset) - var(--top)
		);

		/** create dashes by masking out horizontal lines with repeating vertical lines */
		--dash-on: var(--background-line-dash-on);
		--dash-off: var(--background-line-dash-off);

		mask-image: repeating-linear-gradient(
			to right,
			white,
			white var(--dash-on),
			transparent var(--dash-on),
			transparent
		);
		--dash-full: calc(var(--dash-on) + var(--dash-off));
		mask-size: var(--dash-full) 100%;
	}
</style>
