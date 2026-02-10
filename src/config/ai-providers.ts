/**
 * AI Provider Interface - Unified abstraction for different AI providers
 * This allows seamless switching between OpenAI, Anthropic, Gemini, etc.
 */

import type { AIProvider, AIProviderConfig } from './ai-config';
import { getProviderApiKey } from './ai-config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

export interface AIProviderInterface {
  readonly name: AIProvider;
  readonly models: string[];
  
  /**
   * Initialize the provider with configuration
   */
  initialize(config: AIProviderConfig): Promise<void>;
  
  /**
   * Send a chat completion request
   */
  chat(request: AIRequest): Promise<AIResponse>;
  
  /**
   * Check if the provider is available/healthy
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Get provider-specific endpoint
   */
  getEndpoint(): string;
}

/**
 * OpenAI Provider Implementation
 */
export class OpenAIProvider implements AIProviderInterface {
  readonly name: AIProvider = 'openai';
  readonly models = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
  
  private config!: AIProviderConfig;
  private apiKey!: string;

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config;
    this.apiKey = getProviderApiKey('openai', config);
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const endpoint = this.config.endpoint || 'https://api.openai.com/v1/chat/completions';
    
    const body = {
      model: this.config.model || 'gpt-4o-mini',
      messages: request.messages,
      temperature: request.temperature || this.config.temperature || 0.3,
      max_tokens: request.maxTokens || this.config.maxTokens || 4000,
      stream: request.stream || false,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API Error: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model,
      provider: 'openai',
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getEndpoint(): string {
    return this.config.endpoint || 'https://api.openai.com/v1/chat/completions';
  }
}

/**
 * Anthropic Provider Implementation
 */
export class AnthropicProvider implements AIProviderInterface {
  readonly name: AIProvider = 'anthropic';
  readonly models = ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
  
  private config!: AIProviderConfig;
  private apiKey!: string;

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config;
    this.apiKey = getProviderApiKey('anthropic', config);
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const endpoint = this.config.endpoint || 'https://api.anthropic.com/v1/messages';
    
    // Convert OpenAI format to Anthropic format
    const systemMessage = request.messages.find(m => m.role === 'system');
    const chatMessages = request.messages.filter(m => m.role !== 'system');
    
    const body = {
      model: this.config.model || 'claude-3-haiku-20240307',
      max_tokens: request.maxTokens || this.config.maxTokens || 4000,
      temperature: request.temperature || this.config.temperature || 0.3,
      system: systemMessage?.content,
      messages: chatMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API Error: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    return {
      content: data.content[0]?.text || '',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      model: data.model,
      provider: 'anthropic',
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });
      // Accept both success and rate limit as "available"
      return response.status === 200 || response.status === 429;
    } catch {
      return false;
    }
  }

  getEndpoint(): string {
    return this.config.endpoint || 'https://api.anthropic.com/v1/messages';
  }
}

/**
 * Gemini Provider Implementation
 */
export class GeminiProvider implements AIProviderInterface {
  readonly name: AIProvider = 'gemini';
  readonly models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'];
  
  private config!: AIProviderConfig;
  private apiKey!: string;

  async initialize(config: AIProviderConfig): Promise<void> {
    this.config = config;
    this.apiKey = getProviderApiKey('gemini', config);
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const model = this.config.model || 'gemini-1.5-flash';
    const endpoint = this.config.endpoint || 
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    
    // Convert OpenAI format to Gemini format
    const contents = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const systemInstruction = request.messages.find(m => m.role === 'system')?.content;
    
    const body: any = {
      contents,
      generationConfig: {
        temperature: request.temperature || this.config.temperature || 0.3,
        maxOutputTokens: request.maxTokens || this.config.maxTokens || 4000,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    
    return {
      content: candidate?.content?.parts?.[0]?.text || '',
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      model: model,
      provider: 'gemini',
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const model = this.config.model || 'gemini-1.5-flash';
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${this.apiKey}`,
        { method: 'GET' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  getEndpoint(): string {
    const model = this.config.model || 'gemini-1.5-flash';
    return this.config.endpoint || 
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  }
}

/**
 * Auto Provider - Selects best available provider
 */
export class AutoProvider implements AIProviderInterface {
  readonly name: AIProvider = 'auto';
  readonly models: string[] = [];
  
  private providers: AIProviderInterface[] = [];
  private selectedProvider: AIProviderInterface | null = null;

  async initialize(config: AIProviderConfig): Promise<void> {
    // Initialize all available providers
    this.providers = [
      new OpenAIProvider(),
      new AnthropicProvider(),
      new GeminiProvider(),
    ];

    // Test each provider and select the first available one
    for (const provider of this.providers) {
      try {
        await provider.initialize(config);
        const isAvailable = await provider.isAvailable();
        if (isAvailable) {
          this.selectedProvider = provider;
          console.log(`[AutoProvider] Selected ${provider.name} as primary provider`);
          break;
        }
      } catch (error) {
        console.warn(`[AutoProvider] Provider ${provider.name} unavailable:`, error);
      }
    }

    if (!this.selectedProvider) {
      throw new Error('No AI providers are available');
    }
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    if (!this.selectedProvider) {
      throw new Error('Auto provider not initialized');
    }
    
    return await this.selectedProvider.chat(request);
  }

  async isAvailable(): Promise<boolean> {
    return this.selectedProvider !== null;
  }

  getEndpoint(): string {
    return this.selectedProvider?.getEndpoint() || '';
  }
}

/**
 * Provider Factory - Creates provider instances
 */
export class AIProviderFactory {
  private static providers: Map<AIProvider, AIProviderInterface> = new Map();

  static async getProvider(type: AIProvider, config: AIProviderConfig): Promise<AIProviderInterface> {
    // Return cached provider if available
    if (this.providers.has(type)) {
      const provider = this.providers.get(type)!;
      await provider.initialize(config); // Re-initialize with new config
      return provider;
    }

    // Create new provider
    let provider: AIProviderInterface;
    
    switch (type) {
      case 'openai':
        provider = new OpenAIProvider();
        break;
      case 'anthropic':
        provider = new AnthropicProvider();
        break;
      case 'gemini':
        provider = new GeminiProvider();
        break;
      case 'auto':
        provider = new AutoProvider();
        break;
      default:
        throw new Error(`Unsupported AI provider: ${type}`);
    }

    await provider.initialize(config);
    this.providers.set(type, provider);
    
    return provider;
  }

  static clearCache(): void {
    this.providers.clear();
  }
}