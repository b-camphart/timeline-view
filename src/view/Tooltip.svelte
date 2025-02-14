<script module>
	import { mount, unmount } from "svelte";
	import Tooltip from "./Tooltip.svelte";

	function center(elementBounds: DOMRect) {
		return {
			x: elementBounds.left + elementBounds.width / 2,
			y: elementBounds.top + elementBounds.height / 2,
		};
	}

	export type TooltipProps = {
		mod?: "mod-top" | "mod-right" | "mod-left";
		class?: string;
		label: string;
		side?(elementBounds: DOMRect): { x: number; y: number };
	};

	/** mounts a tooltip on the document body.  can be used as a svelte action */
	export function bodyTooltip(anchor: HTMLElement, args: TooltipProps) {
		let elementBounds = $state.raw(anchor.getBoundingClientRect());
		const effectRoot = $effect.root(() => {
			$effect(() => {
				let cancelled = false;

				function position() {
					if (cancelled) return;
					elementBounds = anchor.getBoundingClientRect();
					requestAnimationFrame(position);
				}
				requestAnimationFrame(position);

				return () => {
					cancelled = true;
				};
			});

			const position = $derived.by(() => {
				const side = args.side ?? center;
				return side(elementBounds);
			});

			const mounted = mount(Tooltip, {
				target: anchor.doc.body,
				props: {
					get x() {
						return position.x;
					},
					get y() {
						return position.y;
					},
					get mod() {
						return args.mod;
					},
					get label() {
						return args.label;
					},
					get class() {
						return args.class;
					},
				},
			});

			return () => {
				unmount(mounted);
			};
		});

		return {
			destroy() {
				effectRoot();
			},
		};
	}
</script>

<script lang="ts">
	const {
		x,
		y,
		mod,
		class: className,
		label,
	}: {
		x: number;
		y: number;
		mod?: "mod-top" | "mod-right" | "mod-left";
		class?: string;
		label: string;
	} = $props();

	let arrow: HTMLDivElement | null = $state(null);

	const deltaX = $derived.by(() => {
		if (mod === "mod-left") {
			return -(arrow?.offsetWidth ?? 0);
		} else if (mod === "mod-right") {
			return arrow?.offsetWidth ?? 0;
		} else {
			return 0;
		}
	});

	const deltaY = $derived.by(() => {
		if (mod === "mod-top") {
			return -(arrow?.offsetHeight ?? 0);
		} else if (mod === undefined) {
			return arrow?.offsetHeight ?? 0;
		} else {
			return 0;
		}
	});

	const left = $derived(x + deltaX);
	const top = $derived(y + deltaY);
</script>

<div
	class="tooltip {mod ?? ''} {className ?? ''}"
	style:left="{left}px"
	style:top="{top}px"
>
	{label}
	<div class="tooltip-arrow" bind:this={arrow}></div>
</div>
