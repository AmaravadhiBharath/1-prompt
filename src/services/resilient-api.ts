/**
 * Resilient API Client - Production-Grade Error Handling
 *
 * Features:
 * - Automatic retry with exponential backoff
 * - Circuit breaker pattern (stops hitting failing services)
 * - Request timeout handling
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
}

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = "HALF_OPEN";
        console.log("[CircuitBreaker] Attempting recovery (HALF_OPEN)");
      } else {
        throw new Error("Service temporarily unavailable - please try again");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = "CLOSED";
        this.successCount = 0;
        console.log("[CircuitBreaker] Service recovered (CLOSED)");
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failures >= this.config.failureThreshold) {
      this.state = "OPEN";
      console.error(
        `[CircuitBreaker] Circuit OPEN after ${this.failures} failures`,
      );
    }
  }

  isHealthy(): boolean {
    return this.state === "CLOSED";
  }
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

const DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60000,
};

// Circuit breaker for backend service
const backendCircuit = new CircuitBreaker(DEFAULT_CIRCUIT_CONFIG);

/**
 * Checks if an error is worth retrying.
 * Retryable: 5xx, timeouts, network connectivity issues.
 * Fatal: 400 (Bad Request), 401 (Auth), 403 (Forbidden), 404 (Not Found), 429 (Quota).
 */
function isRetryable(error: any): boolean {
  if (error.name === 'AbortError') return true; // Timeout
  if (!error.status) return true; // Network/CORS issues usually don't have a status
  if (error.status >= 500) return true; // Server errors
  return false; // Everything else (4xx) is considered fatal/client-error
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  attempt: number = 1,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (!isRetryable(error)) {
      console.error(`[Retry] Fatal error encountered (status: ${error.status}). No retry.`);
      throw error;
    }

    if (attempt >= config.maxRetries) {
      console.error(`[Retry] All ${config.maxRetries} attempts failed. Giving up.`);
      throw error;
    }

    const delay = Math.min(
      config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
      config.maxDelay,
    );

    console.warn(
      `[Retry] Attempt ${attempt}/${config.maxRetries} failed with ${error.message || 'Error'}. Retrying in ${delay}ms...`,
    );
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryWithBackoff(fn, config, attempt + 1);
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 30000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Request timeout after ${timeout / 1000}s`);
    }
    throw error;
  }
}

/**
 * Resilient fetch with circuit breaker + retry + timeout
 */
export async function resilientFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  console.log(`[resilientFetch] Starting request to ${url}`);
  return backendCircuit.execute(async () => {
    console.log(
      `[resilientFetch] Circuit breaker healthy, proceeding with request`,
    );
    return retryWithBackoff(async () => {
      console.log(`[resilientFetch] Making fetch request with timeout 30s`);
      const response = await fetchWithTimeout(url, options);
      console.log(`[resilientFetch] Response received: ${response.status}`);
      if (!response.ok && response.status >= 500) {
        // Server errors should trigger retry
        const error = new Error(`Server error: ${response.status}`);
        (error as any).status = response.status;
        throw error;
      }
      return response;
    });
  });
}

/**
 * Check if backend is healthy
 */
export function isBackendHealthy(): boolean {
  return backendCircuit.isHealthy();
}
