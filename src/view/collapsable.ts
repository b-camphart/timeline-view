export interface Collapsable {
	isCollapsed(): boolean;
	collapse(): void;
	expand(): void;
}

export class ObservableCollapsable implements Collapsable {
	#collapsed: boolean;

	constructor(collapsed: boolean = true) {
		this.#collapsed = collapsed;
	}

	isCollapsed(): boolean {
		return this.#collapsed;
	}

	collapse(): void {
		this.#collapsed = true;
		this.onChange();
	}

	expand(): void {
		this.#collapsed = false;
		this.onChange();
	}

	onChange() {}
}
