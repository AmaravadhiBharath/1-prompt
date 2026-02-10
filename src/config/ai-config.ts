export type AIProvider = "openai" | "anthropic" | "gemini" | "cohere" | "auto";

export interface AIProviderConfig {
  /** The AI provider to use */
  provider: AIProvider;

  /** API key for the provider (Optional: only if user provides their own) */
  apiKey?: string;

  /** Model to use (provider-specific) */
  model?: string;

  /** Custom API endpoint */
  endpoint?: string;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Max tokens for the response */
  maxTokens?: number;

  /** Temperature for response creativity (0-1) */
  temperature?: number;

  /** Whether this provider should be used as fallback */
  isFallback?: boolean;
}

export interface AIConfiguration {
  /** Primary AI provider configuration */
  primary: AIProviderConfig;

  /** Fallback providers in order of preference */
  fallbacks: AIProviderConfig[];

  /** Global settings */
  settings: {
    /** Enable automatic fallback on failure */
    autoFallback: boolean;

    /** Retry attempts per provider */
    retryAttempts: number;

    /** Rate limiting settings */
    rateLimit?: {
      requestsPerMinute: number;
      requestsPerHour: number;
    };
  };

  /** Environment-specific overrides */
  environments: {
    development?: Partial<AIConfiguration>;
    staging?: Partial<AIConfiguration>;
    production?: Partial<AIConfiguration>;
  };
}

// Default configuration that can be overridden
export const DEFAULT_AI_CONFIG: AIConfiguration = {
  primary: {
    provider: "auto",
    model: "gemini-1.5-flash",
    timeout: 30000,
    maxTokens: 4000,
    temperature: 0.3,
  },

  fallbacks: [
    {
      provider: "gemini",
      model: "gemini-1.5-flash",
      timeout: 30000,
      maxTokens: 4000,
      temperature: 0.3,
      isFallback: true,
    },
  ],

  settings: {
    autoFallback: true,
    retryAttempts: 2,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
  },

  environments: {
    development: {
      primary: {
        provider: "gemini",
        model: "gemini-1.5-flash",
        temperature: 0.5,
      },
    },
    production: {
      settings: {
        autoFallback: true,
        retryAttempts: 3,
      },
    },
  },
};

// Provider-specific model mappings
export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  anthropic: [
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
  ],
  gemini: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
  cohere: ["command-r-plus", "command-r", "command", "command-nightly"],
  auto: [],
};

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback?: string): string | undefined {
  if (typeof globalThis !== "undefined" && (globalThis as any).process?.env) {
    return (globalThis as any).process.env[key] || fallback;
  }
  if (typeof window !== "undefined" && (window as any).process?.env) {
    return (window as any).process.env[key] || fallback;
  }
  return fallback;
}

/**
 * Load AI configuration from environment variables
 */
export function loadAIConfiguration(): AIConfiguration {
  let config = { ...DEFAULT_AI_CONFIG };

  const envProvider = getEnvVar("AI_PROVIDER") as AIProvider;
  const envModel = getEnvVar("AI_MODEL");

  if (envProvider && PROVIDER_MODELS[envProvider]) {
    config.primary.provider = envProvider;
  }

  if (envModel) {
    config.primary.model = envModel;
  }

  return config;
}

/**
 * Validate AI configuration
 */
export function validateAIConfig(config: AIConfiguration): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.primary.provider || !PROVIDER_MODELS[config.primary.provider]) {
    errors.push(`Invalid primary provider: ${config.primary.provider}`);
  }

  if (config.primary.model && config.primary.provider !== "auto") {
    const validModels = PROVIDER_MODELS[config.primary.provider];
    if (validModels && !validModels.includes(config.primary.model)) {
      errors.push(
        `Model ${config.primary.model} is not valid for provider ${config.primary.provider}`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
