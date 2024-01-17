import { writable, type Writable } from "svelte/store";

export interface NamespacedWritableFactory<T> {

    make<K extends keyof T>(key: K, defaultValue: T[K]): Writable<T[K]>
    namespace<K extends keyof T>(name: K): NamespacedWritableFactory<T[K]>;

}

export function writableProperties<T extends { [key: string]: any }>(
    object: Partial<T>,
    onChildModified: <K extends keyof T>(key: K, newValue: T[K]) => void
): NamespacedWritableFactory<T> {
    const children = new Map<string, Writable<any>>();
    const childNamespaces = new Map<string, NamespacedWritableFactory<any>>();

    return {
        make(key, defaultValue) {
            let child = children.get(String(key))
            if (child) {
                return child
            }

            if (key in object) {
                child = writable(object[key])
            } else {
                child = writable(defaultValue)
            }
            child.subscribe(newValue => {
                if (object[key] !== newValue) {
                    object[key] = newValue
                    onChildModified(key, newValue)
                }
            })
            children.set(String(key), child)
            return child
        },
        namespace<K extends keyof T>(name: K) {
            let childNamespace = childNamespaces.get(String(name))
            if (childNamespace) {
                return childNamespace
            }

            const childObj = (object[name] || {}) as Partial<Partial<T>[K]>
            childNamespace = writableProperties<Partial<Partial<T>[K]>>(childObj, (key, newObj) => {
                childObj[key] = newObj
                onChildModified(name, childObj as any)
            })
            childNamespaces.set(String(name), childNamespace)
            return childNamespace

        },
    }
}