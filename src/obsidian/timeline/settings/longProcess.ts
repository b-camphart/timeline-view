export interface Process {
	stop(): void;
	completion(): Promise<any>;
}

const processLog =
	import.meta.env.MODE === "development" ? console.log : () => {};

let latestProcessId = 0;
export function longProcess<T>(
	items: readonly T[],
	processItem: (item: T) => Promise<void>,
): Process {
	const processInstance = new LongProcess<T>(++latestProcessId, processItem);

	processLog(`[${latestProcessId}] starting...`);
	processInstance.processBatch(0, items);

	return processInstance;
}

class LongProcess<T> implements Process {
	private processing = true;

	constructor(
		private id: number,
		private processItem: (item: T) => Promise<any>,
	) {}

	stop(): void {
		this.processing = false;
	}

	private _completion: Promise<any> | undefined;
	private _resolve: ((result: any) => void) | undefined;
	private _reject: ((reson: any) => void) | undefined;
	completion(): Promise<any> {
		if (this._completion == null) {
			this._completion = new Promise((resolve, reject) => {
				this._resolve = resolve;
				this._reject = reject;
			});
		}

		return this._completion;
	}

	async processBatch(
		i: number,
		items: readonly T[],
		previousProcesses: readonly Promise<void>[] = [],
	) {
		const start = performance.now();
		if (previousProcesses.length > 0) {
			await Promise.all(previousProcesses);
		}
		const processes: Promise<void>[] = [];

		for (i; i < items.length; i++) {
			if (!this.processing) {
				processLog(`  [${this.id}] CANCELLED`);
				this._reject?.call(null, "Cancelled");
				return;
			}
			if (import.meta.env.MODE === "development") {
				if (i % 1000 === 0) {
					processLog(`  [${this.id}] Processed`, i, "items");
				}
			}
			processes.push(this.processItem(items[i]));

			const elapsedTime = performance.now() - start;
			if (elapsedTime >= 16 /* 1/60 */) {
				break;
			}
		}

		if (i < items.length) {
			setTimeout(() => this.processBatch(i, items, processes), 0);
		} else {
			processLog(`[${this.id}] COMPLETE`);
			this._resolve?.call(null, undefined);
		}
	}
}