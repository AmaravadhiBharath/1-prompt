/**
 * AI Provider Configuration System
 * Allows switching between different AI providers (OpenAI, Gemini, Anthropic, etc.)
 * without code changes - just update the config file or environment variables.
 */

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'cohere' | 'auto';

export interface AIProviderConfig {
  /** The AI provider to use */
  provider: AIProvider;
  
  /** API key for the provider (can be set via env var) */
  apiKey?: string;
  
  /** Model to use (provider-specific) */
  model?: string;
  
  /** Custom API endpoint (for self-hosted or regional endpoints) */
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
    provider: 'auto',
    model: 'gpt-4o-mini',
    timeout: 30000,
    maxTokens: 4000,
    temperature: 0.3,
  },
  
  fallbacks: [
    {
      provider: 'anthropic',
      model: 'claude-3-haiku-20240307',
      timeout: 30000,
      maxTokens: 4000,
      temperature: 0.3,
      isFallback: true,
    },
    {
      provider: 'gemini',
      model: 'gemini-1.5-flash',
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
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.5, // More creative for dev
      },
    },
    production: {
      settings: {
        autoFallback: true,
        retryAttempts: 3, // More retries in prod
      },
    },
  },
};

// Provider-specific model mappings
export const PROVIDER_MODELS: Record<AIProvider, string[]> = {
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
  ],
  anthropic: [
    'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ],
  gemini: [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro',
  ],
  cohere: [
    'command-r-plus',
    'command-r',
    'command',
    'command-nightly',
  ],
  auto: [], // Auto-selection
};

// Default endpoints for each provider
export const PROVIDER_ENDPOINTS: Record<Exclude<AIProvider, 'auto'>, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  cohere: 'https://api.cohere.ai/v1/chat',
};

/**
 * Get environment variable with fallback
 */
function getEnvVar(key: string, fallback?: string): string | undefined {
  if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) {
    return (globalThis as any).process.env[key] || fallback;
  }
  if (typeof window !== 'undefined' && (window as any).process?.env) {
    return (window as any).process.env[key] || fallback;
  }
  return fallback;
}

/**
 * Load AI configuration from environment variables and config files
 * Priority: Environment Variables > Remote Config > Default Config
 */
export function loadAIConfiguration(): AIConfiguration {
  // Start with default config
  let config = { ...DEFAULT_AI_CONFIG };
  
  // Override with environment variables if available
  const envProvider = getEnvVar('AI_PROVIDER') as AIProvider;
  const envApiKey = getEnvVar('AI_API_KEY');
  const envModel = getEnvVar('AI_MODEL');
  const envEndpoint = getEnvVar('AI_ENDPOINT');
  
  if (envProvider && PROVIDER_MODELS[envProvider]) {
    config.primary.provider = envProvider;
  }
  
  if (envApiKey) {
    config.primary.apiKey = envApiKey;
  }
  
  if (envModel) {
    config.primary.model = envModel;
  }
  
  if (envEndpoint) {
    config.primary.endpoint = envEndpoint;
  }
  
  // Environment-specific overrides
  const nodeEnv = getEnvVar('NODE_ENV', 'production') as keyof typeof config.environments;
  if (config.environments[nodeEnv]) {
    config = mergeConfigs(config, config.environments[nodeEnv] as AIConfiguration);
  }
  
  return config;
}

/**
 * Deep merge two configuration objects
 */
function mergeConfigs(base: AIConfiguration, override: Partial<AIConfiguration>): AIConfiguration {
  return {
    primary: { ...base.primary, ...override.primary },
    fallbacks: override.fallbacks || base.fallbacks,
    settings: { ...base.settings, ...override.settings },
    environments: { ...base.environments, ...override.environments },
  };
}

/**
 * Validate AI configuration
 */
export function validateAIConfig(config: AIConfiguration): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check primary provider
  if (!config.primary.provider || !PROVIDER_MODELS[config.primary.provider]) {
    errors.push(`Invalid primary provider: ${config.primary.provider}`);
  }
  
  // Check model compatibility
  if (config.primary.model && config.primary.provider !== 'auto') {
    const validModels = PROVIDER_MODELS[config.primary.provider];
    if (!validModels.includes(config.primary.model)) {
      errors.push(`Model ${config.primary.model} is not valid for provider ${config.primary.provider}`);
    }
  }
  
  // Check fallback providers
  for (const fallback of config.fallbacks) {
    if (!fallback.provider || !PROVIDER_MODELS[fallback.provider]) {
      errors.push(`Invalid fallback provider: ${fallback.provider}`);
    }
  }
  
  // Check timeout values
  if (config.primary.timeout && config.primary.timeout < 1000) {
    errors.push('Timeout must be at least 1000ms');
  }
  
  // Check temperature range
  if (config.primary.temperature !== undefined && 
      (config.primary.temperature < 0 || config.primary.temperature > 1)) {
    errors.push('Temperature must be between 0 and 1');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get API key for a specific provider
 * Priority: Config > Environment Variable > Error
 */
export function getProviderApiKey(provider: AIProvider, config: AIProviderConfig): string {
  // Check config first
  if (config.apiKey) {
    return config.apiKey;
  }
  
  // Check environment variables
  const envKeys: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    gemini: 'GEMINI_API_KEY',
    cohere: 'COHERE_API_KEY',
  };
  
  const envKey = getEnvVar(envKeys[provider]);
  if (envKey) {
    return envKey;
  }
  
  throw new Error(`No API key found for provider ${provider}. Set ${envKeys[provider]} environment variable or configure in config file.`);
}