/**
 * Fast, stable non-cryptographic hash for caching.
 * Uses a simple but effective DJB2-like algorithm.
 * Avoids browser-only globals like btoa or crypto.subtle for universal compatibility.
 */
export function fastHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
}

/**
 * Robust SHA-256 hash using Web Crypto API.
 * Async and highly collision-resistant.
 */
export async function computeSHA256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
