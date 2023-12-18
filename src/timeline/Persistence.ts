import { writable, type Writable } from "svelte/store";

export interface NamespacedWritableFactory {

    make<T>(key: string, defaultValue: T): Writable<T>
    namespace(name: string): NamespacedWritableFactory;

}

export function namespacedWritableFactory(
    namespace: string, 
    parent: Pick<Writable<any | undefined | null>, "update" | "subscribe">
): NamespacedWritableFactory {
    const children = new Map<string, Writable<any>>();

    return {
        make<T>(key: string, defaultValue: T) {
            const namespacedKey = `${namespace}${key}`;
            let child: Writable<T> | undefined = children.get(namespacedKey);
            if (child != null) {
                return child;
            }

            let firstParentEvent = true
            let backingWritable = writable<T>(defaultValue)
            parent.subscribe((newParentValue) => {
                if (firstParentEvent) {
                    if (newParentValue == null) {
                        backingWritable.set(defaultValue)
                    } else {
                        backingWritable.set(newParentValue[namespacedKey] ?? defaultValue)
                    }
                    firstParentEvent = false;
                } else {
                    if (newParentValue == null) {
                        backingWritable.set(defaultValue);
                    } else {
                        backingWritable.set(newParentValue[namespacedKey])
                    }
                }
            })
            child = {
                subscribe: backingWritable.subscribe,
                set(value) {
                    backingWritable.set(value);
                    parent.update(oldParentValue => {
                        if (oldParentValue == null) {
                            return oldParentValue
                        }
                        oldParentValue[namespacedKey] = value;
                        return oldParentValue
                    })
                },
                update(updater) {
                    backingWritable.update(updater);
                    parent.update(oldParentValue => {
                        if (oldParentValue == null) {
                            return oldParentValue
                        }
                        oldParentValue[namespacedKey] = updater(oldParentValue[namespacedKey]);
                        return oldParentValue
                    })
                }
            };
            children.set(namespacedKey, child);
            return child;
        },
        namespace(name: string) {
            const namespacedKey = `${namespace}${name}`
            return namespacedWritableFactory(`${namespacedKey}.`, parent);
        },
    };
}
