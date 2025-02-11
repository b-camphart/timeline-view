<div></div>

<style>
	div {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;

		pointer-events: none;

		--line-color: var(--background-line-color);
		--line-width: var(--background-line-width);
		--gap: var(--item-cross-axis-spacing);
		--start-y: calc(var(--padding-top) + var(--gap) / 2);

		background: linear-gradient(
			var(--line-color),
			var(--line-color) var(--line-width),
			transparent var(--line-width),
			transparent
		);
		background-size: 100% var(--gap);
		background-position-y: calc(var(--start-y) - var(--cross-axis-scroll));

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
