import { RemoteConfig, STORAGE_KEY, LAST_FETCH_KEY } from './remote-config';
import { resilientFetch } from './resilient-api';
import { config } from '../config';

export async function fetchRemoteConfigUpdates(currentVersion: number): Promise<void> {
    try {
        // Try to fetch from Backend
        const response = await resilientFetch(`${config.backend.url}/config/selectors`, {
            method: 'GET'
        });

        if (response.ok) {
            const data = await response.json();
            const remoteData = data.config as RemoteConfig;

            // Basic validation
            if (remoteData && remoteData.version && remoteData.version > currentVersion) {
                console.log('[RemoteConfig] New version found:', remoteData.version);
                await chrome.storage.local.set({ [STORAGE_KEY]: remoteData });
            }
        }

        // On success (or even if no new version), update last fetch time
        await chrome.storage.local.set({ [LAST_FETCH_KEY]: Date.now() });

    } catch (error) {
        console.warn('[RemoteConfig] Update failed, using cached config:', error);
    }
}
