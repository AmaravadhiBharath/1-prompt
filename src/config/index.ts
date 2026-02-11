/**
 * Configuration Management
 * Priority: Runtime Config (Backend) > Bundled Defaults
 */

interface Config {
  backend: {
    url: string;
  };
  features: {
    telemetryEnabled: boolean;
    remoteSelectorEnabled: boolean;
  };
  analytics: {
    posthogKey: string;
    posthogHost: string;
  };
  email: {
    resendKey: string;
  };
  ai: {
    defaultProvider: string;
    model?: string;
  };
}

const BUNDLED_CONFIG: Config = {
  backend: {
    url:
      (import.meta as any).env.VITE_BACKEND_URL ||
      "https://1prompt-backend.amaravadhibharath.workers.dev",
  },
  features: {
    telemetryEnabled: true,
    remoteSelectorEnabled: true,
  },
  analytics: {
    posthogKey: (import.meta as any).env.VITE_POSTHOG_KEY || "",
    posthogHost:
      (import.meta as any).env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
  },
  email: {
    resendKey: (import.meta as any).env.VITE_RESEND_API_KEY || "",
  },
  ai: {
    defaultProvider:
      (import.meta as any).env.VITE_DEFAULT_AI_PROVIDER || "gemini",
    model: (import.meta as any).env.VITE_DEFAULT_AI_MODEL || "gemini-2.0-flash",
  },
};

class ConfigService {
  private config: Config = BUNDLED_CONFIG;
  private loaded = false;

  async load(): Promise<Config> {
    if (this.loaded) return this.config;

    try {
      // Try to fetch from Backend
      const response = await fetch(
        `${BUNDLED_CONFIG.backend.url}/config/runtime`,
      );
      if (response.ok) {
        const data = await response.json();
        const remoteConfig = data.config as Partial<Config>;
        this.config = this.mergeConfig(BUNDLED_CONFIG, remoteConfig);
        console.log("[Config] Loaded runtime config from Backend");
      }
    } catch (error) {
      console.log("[Config] Using bundled config");
    }

    this.loaded = true;
    return this.config;
  }

  private mergeConfig(base: Config, override: Partial<Config>): Config {
    return {
      backend: { ...base.backend, ...override.backend },
      features: { ...base.features, ...override.features },
      analytics: { ...base.analytics, ...override.analytics },
      email: { ...base.email, ...override.email },
      ai: { ...base.ai, ...override.ai },
    };
  }

  get backend() {
    return this.config.backend;
  }
  get features() {
    return this.config.features;
  }
  get analytics() {
    return this.config.analytics;
  }
  get email() {
    return this.config.email;
  }
  get ai() {
    return this.config.ai;
  }
}

export const config = new ConfigService();
