export interface Process {
    stop(): void;
    completion(): Promise<any>
}

const processLog = console.log

let latestProcessId = 0;
export function longProcess<T>(items: readonly T[], process: (item: T) => Promise<void>): Process {
    const processInstance = new LongProcess<T>(++latestProcessId, process)

    processLog(`[${latestProcessId}] starting...`)
    processInstance.processBatch(0, items)    

    return processInstance
}

class LongProcess<T> implements Process {

    private processing = true;

    constructor(
        private id: number,
        private process: (item: T) => Promise<any>
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
                this._resolve = resolve
                this._reject = reject
            })
        }

        return this._completion
    }

    async processBatch(i: number, items: readonly T[]) {
        const start = performance.now();

        for (i; i < items.length; i++) {
            // while we're still applying the colors, if a group is changed again,
            // a new process will be started for this context.  We should cancel 
            // and allow the new process to set the colors
            if (!this.processing) {
                processLog(`  [${this.id}] CANCELLED`)
                this._reject?.call(null, "Cancelled")
                return;
            }
            if (i % 1000 === 0) {
                processLog(`  [${this.id}] Processed`, i, "items")
            }
            await this.process(items[i])

            const elapsedTime = performance.now() - start
            if (elapsedTime > 16.67 /* 1/60 */) {
                break;
            }

        }

        if (i < items.length) {
            setTimeout(() => this.processBatch(i, items), 0)
        } else {
            processLog(`[${this.id}] COMPLETE`)
            this._resolve?.call(null, undefined);
        }
    }

}