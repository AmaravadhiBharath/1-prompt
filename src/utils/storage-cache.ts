/**
 * Persistent cache using chrome.storage.local.
 * Automatically handles serialization and expiration.
 */
export class StorageCache {
    private namespace: string;

    constructor(namespace: string) {
        this.namespace = `cache_${namespace}_`;
    }

    async get<T>(key: string): Promise<T | null> {
        const fullKey = this.namespace + key;
        const result = await chrome.storage.local.get(fullKey);
        const data = result[fullKey];

        if (!data) return null;

        if (data.expiry && Date.now() > data.expiry) {
            await this.delete(key);
            return null;
        }

        return data.value as T;
    }

    async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
        const fullKey = this.namespace + key;
        const data = {
            value,
            expiry: Date.now() + ttlMs,
        };
        await chrome.storage.local.set({ [fullKey]: data });
    }

    async delete(key: string): Promise<void> {
        const fullKey = this.namespace + key;
        await chrome.storage.local.remove(fullKey);
    }

    /**
     * Cleans up all expired entries in this namespace.
     * Can be called periodically.
     */
    async purge(): Promise<void> {
        const all = await chrome.storage.local.get(null);
        const keysToDelete = Object.keys(all).filter(k =>
            k.startsWith(this.namespace) && all[k].expiry && Date.now() > all[k].expiry
        );
        if (keysToDelete.length > 0) {
            await chrome.storage.local.remove(keysToDelete);
        }
    }
}
