export class TaskQueue {
	static new() {
		let end = 0;
		return new TaskQueue(
			() => {
				end = performance.now() + 16;
			},
			() => end >= performance.now(),
		);
	}
	constructor(private readonly onBatchStart: () => void, private readonly continueBatch: () => boolean) {}

	private tasks: (() => Promise<void> | void)[] = [];
	#running = false;
	enqueue(task: () => Promise<void> | void) {
		if (this.cancelled) return;
		this.tasks.push(task);
		if (!this.#running) {
			this.#running = true;
			this.#process();
		}
	}

	#progressCallbacks = new Set<(length: number) => void>();
	onProgress(cb: (length: number) => void) {
		cb(this.tasks.length);
		this.#progressCallbacks.add(cb);
	}

	private cancelled = false;
	cancel() {
		this.cancelled = true;
	}

	async #process(previousBatch: Promise<unknown> = Promise.resolve()) {
		if (this.cancelled) return;

		this.onBatchStart();
		await previousBatch;

		const batch: Array<Promise<void> | void> = [];
		let task = this.tasks.shift();
		while (task && this.continueBatch()) {
			batch.push(task());
			task = this.tasks.shift();
		}
		this.#progressCallbacks.forEach(cb => cb(this.tasks.length));
		if (batch.length > 0) {
			setTimeout(() => this.#process(Promise.all(batch)), 0);
		} else {
			this.#running = false;
		}
	}
}
