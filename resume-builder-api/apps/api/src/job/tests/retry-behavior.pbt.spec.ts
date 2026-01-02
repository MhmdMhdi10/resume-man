/**
 * Feature: resume-builder-auto-sender
 * Property 8: Retry Behavior with Exponential Backoff
 * Validates: Requirements 5.4, 6.4
 *
 * For any failed external request (Jabinja API or application submission),
 * the retry mechanism should attempt up to the configured maximum retries
 * with exponentially increasing delays.
 */

import * as fc from 'fast-check';
import {
  withRetry,
  calculateDelay,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
} from '../utils/retry.util';

describe('Retry Behavior Property Tests', () => {
  /**
   * Property: Delay should increase exponentially with each attempt
   */
  it('should calculate exponentially increasing delays', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 100, max: 5000 }),
        fc.integer({ min: 10000, max: 60000 }),
        async (attempt, baseDelayMs, maxDelayMs) => {
          fc.pre(baseDelayMs < maxDelayMs);

          const config: RetryConfig = {
            maxRetries: 10,
            baseDelayMs,
            maxDelayMs,
            jitterFactor: 0, // No jitter for deterministic testing
          };

          const delay = calculateDelay(attempt, config);
          const expectedBase = baseDelayMs * Math.pow(2, attempt);
          const expectedCapped = Math.min(expectedBase, maxDelayMs);

          expect(delay).toBe(expectedCapped);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Delay should never exceed maxDelayMs
   */
  it('should cap delay at maxDelayMs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 100, max: 2000 }),
        fc.integer({ min: 5000, max: 30000 }),
        fc.integer({ min: 0, max: 50 }).map(n => n / 100), // 0 to 0.5 jitter
        async (attempt, baseDelayMs, maxDelayMs, jitterFactor) => {
          fc.pre(baseDelayMs < maxDelayMs);

          const config: RetryConfig = {
            maxRetries: 20,
            baseDelayMs,
            maxDelayMs,
            jitterFactor,
          };

          const delay = calculateDelay(attempt, config);

          // With jitter, max possible delay is maxDelayMs * (1 + jitterFactor)
          const maxPossibleDelay = maxDelayMs * (1 + jitterFactor);
          expect(delay).toBeLessThanOrEqual(maxPossibleDelay);
          expect(delay).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Retry should attempt exactly maxRetries + 1 times on persistent failure
   */
  it('should attempt maxRetries + 1 times on persistent failure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 5 }),
        async (maxRetries) => {
          let attemptCount = 0;

          const failingFn = async () => {
            attemptCount++;
            throw new Error('Persistent failure');
          };

          const config: RetryConfig = {
            maxRetries,
            baseDelayMs: 1, // Minimal delay for fast tests
            maxDelayMs: 10,
            jitterFactor: 0,
          };

          const result = await withRetry(failingFn, config);

          expect(result.success).toBe(false);
          expect(result.attempts).toBe(maxRetries + 1);
          expect(attemptCount).toBe(maxRetries + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Retry should stop immediately on success
   */
  it('should stop retrying on success', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 4 }),
        async (maxRetries, successOnAttempt) => {
          fc.pre(successOnAttempt <= maxRetries);

          let attemptCount = 0;
          const expectedResult = { data: 'success' };

          const fn = async () => {
            attemptCount++;
            if (attemptCount <= successOnAttempt) {
              throw new Error('Temporary failure');
            }
            return expectedResult;
          };

          const config: RetryConfig = {
            maxRetries,
            baseDelayMs: 1,
            maxDelayMs: 10,
            jitterFactor: 0,
          };

          const result = await withRetry(fn, config);

          expect(result.success).toBe(true);
          expect(result.data).toEqual(expectedResult);
          expect(result.attempts).toBe(successOnAttempt + 1);
          expect(attemptCount).toBe(successOnAttempt + 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Delays array should have length equal to retry count
   */
  it('should record correct number of delays', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        async (maxRetries) => {
          const failingFn = async () => {
            throw new Error('Failure');
          };

          const config: RetryConfig = {
            maxRetries,
            baseDelayMs: 1,
            maxDelayMs: 10,
            jitterFactor: 0,
          };

          const result = await withRetry(failingFn, config);

          // Delays are recorded between attempts, so maxRetries delays
          expect(result.delays.length).toBe(maxRetries);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Each recorded delay should follow exponential pattern
   */
  it('should record exponentially increasing delays', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 4 }),
        fc.integer({ min: 10, max: 50 }),
        async (maxRetries, baseDelayMs) => {
          const failingFn = async () => {
            throw new Error('Failure');
          };

          const config: RetryConfig = {
            maxRetries,
            baseDelayMs,
            maxDelayMs: 100000, // High max to avoid capping
            jitterFactor: 0,
          };

          const result = await withRetry(failingFn, config);

          // Verify delays follow exponential pattern
          for (let i = 0; i < result.delays.length; i++) {
            const expectedDelay = baseDelayMs * Math.pow(2, i);
            expect(result.delays[i]).toBe(expectedDelay);
          }
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  /**
   * Property: Jitter should add randomness within bounds
   */
  it('should apply jitter within configured bounds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 100, max: 1000 }),
        fc.integer({ min: 5, max: 20 }).map(n => n / 100), // 0.05 to 0.2 jitter
        async (attempt, baseDelayMs, jitterFactor) => {
          const config: RetryConfig = {
            maxRetries: 5,
            baseDelayMs,
            maxDelayMs: 100000,
            jitterFactor,
          };

          // Run multiple times to verify jitter adds variance
          const delays: number[] = [];
          for (let i = 0; i < 10; i++) {
            delays.push(calculateDelay(attempt, config));
          }

          const baseExpected = baseDelayMs * Math.pow(2, attempt);
          const minExpected = baseExpected * (1 - jitterFactor);
          const maxExpected = baseExpected * (1 + jitterFactor);

          // All delays should be within jitter bounds
          for (const delay of delays) {
            expect(delay).toBeGreaterThanOrEqual(Math.floor(minExpected));
            expect(delay).toBeLessThanOrEqual(Math.ceil(maxExpected));
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Error should be preserved from last attempt
   */
  it('should preserve error from last failed attempt', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (maxRetries, errorMessage) => {
          let attemptCount = 0;

          const failingFn = async () => {
            attemptCount++;
            throw new Error(`${errorMessage}-${attemptCount}`);
          };

          const config: RetryConfig = {
            maxRetries,
            baseDelayMs: 1,
            maxDelayMs: 10,
            jitterFactor: 0,
          };

          const result = await withRetry(failingFn, config);

          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error?.message).toBe(`${errorMessage}-${maxRetries + 1}`);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Zero retries should attempt exactly once
   */
  it('should attempt exactly once with zero retries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (shouldSucceed) => {
          let attemptCount = 0;

          const fn = async () => {
            attemptCount++;
            if (!shouldSucceed) {
              throw new Error('Failure');
            }
            return 'success';
          };

          const config: RetryConfig = {
            maxRetries: 0,
            baseDelayMs: 1,
            maxDelayMs: 10,
            jitterFactor: 0,
          };

          const result = await withRetry(fn, config);

          expect(attemptCount).toBe(1);
          expect(result.attempts).toBe(1);
          expect(result.delays.length).toBe(0);
          expect(result.success).toBe(shouldSucceed);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Default config should have sensible values
   */
  it('should have valid default configuration', () => {
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBeGreaterThanOrEqual(1);
    expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBeGreaterThan(0);
    expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBeGreaterThan(DEFAULT_RETRY_CONFIG.baseDelayMs);
    expect(DEFAULT_RETRY_CONFIG.jitterFactor).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_RETRY_CONFIG.jitterFactor).toBeLessThanOrEqual(1);
  });
});
