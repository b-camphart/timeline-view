import { writable, type Writable } from "svelte/store";

export interface NamespacedWritableFactory {

    make<T>(key: string, defaultValue: T): Writable<T>
    namespace(name: string): NamespacedWritableFactory;

}

export function namespacedWritableFactory(
    namespace: string, 
    writableFactory: <T>(name: string, defaultValue: T) => Writable<T>
): NamespacedWritableFactory {
    const children = new Map<string, Writable<any>>();

    return {
        make<T>(key: string, defaultValue: T) {
            const namespacedKey = `${namespace}${key}`;
            let child: Writable<T> | undefined = children.get(namespacedKey);
            if (child != null) {
                return child;
            }

            child = writableFactory(namespacedKey, defaultValue)
            children.set(namespacedKey, child)
            return child
        },
        namespace(name: string) {
            const namespacedKey = `${namespace}${name}`
            return namespacedWritableFactory(`${namespacedKey}.`, writableFactory);
        },
    };
}
