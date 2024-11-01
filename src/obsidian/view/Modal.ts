import obsidian from "obsidian";

export function openModal(app: obsidian.App, callback: (element: obsidian.Modal) => () => void) {
	new Modal(app, callback).open();
}

class Modal extends obsidian.Modal {
	constructor(
		app: obsidian.App,
		private callback: (element: obsidian.Modal) => () => void,
	) {
		super(app);
	}

	private _clean(): void {}

	onOpen(): void {
		this._clean = this.callback(this);
	}

	onClose(): void {
		this._clean();
		this.containerEl.empty();
	}
}
