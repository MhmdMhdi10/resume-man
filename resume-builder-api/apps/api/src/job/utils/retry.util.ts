import { Logger } from '@nestjs/common';

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor?: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitterFactor: 0.1,
};

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  delays: number[];
}

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig,
): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  
  // Add jitter (±jitterFactor)
  const jitterFactor = config.jitterFactor ?? 0.1;
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);
  
  return Math.max(0, Math.round(cappedDelay + jitter));
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  logger?: Logger,
): Promise<RetryResult<T>> {
  const delays: number[] = [];
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const data = await fn();
      return {
        success: true,
        data,
        attempts: attempt + 1,
        delays,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        delays.push(delay);
        
        logger?.warn(
          `Attempt ${attempt + 1} failed, retrying in ${delay}ms: ${lastError.message}`,
        );
        
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: config.maxRetries + 1,
    delays,
  };
}

/**
 * Decorator for adding retry logic to class methods
 */
export function Retry(config: Partial<RetryConfig> = {}) {
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = this.logger as Logger | undefined;
      
      const result = await withRetry(
        () => originalMethod.apply(this, args),
        fullConfig,
        logger,
      );

      if (result.success) {
        return result.data;
      }

      throw result.error;
    };

    return descriptor;
  };
}
