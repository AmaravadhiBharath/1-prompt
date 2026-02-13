(function () {
    // Robust Chrome API Polyfill for Web
    window.chrome = window.chrome || {};
    window.is1PromptPolyfill = true; // Signal that this is a mock environment
    
    const mock = (obj, defaults) => {
        if (!window.chrome[obj]) window.chrome[obj] = defaults;
        else Object.assign(window.chrome[obj], defaults);
    };

    mock('runtime', {
        id: 'mock-runtime-id',
        sendMessage: (msg, cb) => { if (cb) cb(); },
        onMessage: { addListener: () => { }, removeListener: () => { } },
        lastError: null
    });
    mock('storage', {
        local: { get: (k, cb) => cb({}), set: (k, cb) => cb && cb(), remove: (k, cb) => cb && cb() },
        session: { get: (k, cb) => cb({}), set: (k, cb) => cb && cb(), remove: (k, cb) => cb && cb() },
        onChanged: { addListener: () => { }, removeListener: () => { } }
    });
    mock('action', { getUserSettings: async () => ({ isOnToolbar: false }) });
    mock('identity', { getAuthToken: (opts, cb) => cb(null), removeCachedAuthToken: () => { } });
    mock('sidePanel', { open: async () => { } });
    mock('windows', { getCurrent: async () => ({ id: 1 }) });
    
    console.log('✅ Chrome API Polyfill Active');
})();