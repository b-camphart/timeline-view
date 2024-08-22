<script lang="ts">
	interface $$Props {
		readonly scrollTop: number;
		readonly itemDimensions: Readonly<{
			height: number;
			margin: Readonly<{
				vertical: number;
			}>;
		}>;
		readonly viewport: Readonly<{
			padding: Readonly<{
				top: number;
			}>;
		}>;
	}

	export let scrollTop: $$Props["scrollTop"];
	export let itemDimensions: $$Props["itemDimensions"];
	export let viewport: $$Props["viewport"];

	$: spacingBetweenItems =
		itemDimensions.height + itemDimensions.margin.vertical;
	$: rowCenterOffset = spacingBetweenItems / 2 + viewport.padding.top + 0.5;

	const backgroundPatternId = Math.random().toString(36).slice(2);
</script>

<svg class="stage-background">
	<pattern
		id={backgroundPatternId}
		patternUnits="userSpaceOnUse"
		x={0}
		y={-scrollTop}
		height={spacingBetweenItems * 2}
		width="100%"
	>
		<line x1="0" y1={rowCenterOffset} x2={"100%"} y2={rowCenterOffset} />
	</pattern>
	<rect
		x="0"
		y="0"
		width="100%"
		height="100%"
		fill="url(#{backgroundPatternId})"
	/>
</svg>

<style>
	svg {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	svg line {
		stroke-width: 1px;
	}

	/* Exposed for overriding in obsidian */

	:global(.stage-background line) {
		stroke: var(--color-base-30);
	}
</style>
