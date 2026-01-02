/**
 * Feature: resume-builder-auto-sender
 * Property 6: Rate Limiting Enforcement
 * Validates: Requirements 9.1, 9.3
 *
 * For any user making API requests, if the request count exceeds 100 within
 * a minute window, subsequent requests should receive 429 status with valid
 * retry-after header.
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RedisService } from '../../database/redis.service';

// Mock Redis service for testing
class MockRedisService {
  private store: Map<string, { value: number; expiry: number }> = new Map();

  async incr(key: string): Promise<number> {
    const now = Date.now();
    const existing = this.store.get(key);
    
    if (existing && existing.expiry > now) {
      existing.value += 1;
      return existing.value;
    }
    
    // Key doesn't exist or expired
    this.store.set(key, { value: 1, expiry: now + 60000 });
    return 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    const existing = this.store.get(key);
    if (existing) {
      existing.expiry = Date.now() + seconds * 1000;
    }
  }

  async ttl(key: string): Promise<number> {
    const existing = this.store.get(key);
    if (!existing) return -2;
    const remaining = Math.ceil((existing.expiry - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  reset(): void {
    this.store.clear();
  }

  // Simulate a specific count for a key
  setCount(key: string, count: number, ttlSeconds: number = 60): void {
    this.store.set(key, { 
      value: count, 
      expiry: Date.now() + ttlSeconds * 1000 
    });
  }
}

describe('Rate Limiting Property Tests', () => {
  let guard: RateLimitGuard;
  let mockRedisService: MockRedisService;

  const createMockContext = (userId?: string, ip: string = '127.0.0.1'): ExecutionContext => {
    const mockResponse = {
      setHeader: jest.fn(),
    };
    
    const mockRequest = {
      user: userId ? { userId } : undefined,
      ip,
      headers: {},
      connection: { remoteAddress: ip },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    mockRedisService = new MockRedisService();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue: any) => {
              if (key === 'RATE_LIMIT_MAX') return 100;
              if (key === 'RATE_LIMIT_WINDOW_SECONDS') return 60;
              return defaultValue;
            }),
          },
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
  });

  afterEach(() => {
    mockRedisService.reset();
  });

  /**
   * Property: Requests within limit should always be allowed
   */
  it('should allow requests when count is within limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.uuid(),
        async (requestCount, userId) => {
          mockRedisService.reset();
          
          // Simulate requestCount - 1 previous requests
          if (requestCount > 1) {
            const key = `ratelimit:user:${userId}:${Math.floor(Date.now() / 60000)}`;
            mockRedisService.setCount(key, requestCount - 1);
          }

          const context = createMockContext(userId);
          const result = await guard.canActivate(context);
          
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Requests exceeding limit should be rejected with 429
   */
  it('should reject requests when count exceeds limit with 429 status', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 101, max: 500 }),
        fc.uuid(),
        async (requestCount, userId) => {
          mockRedisService.reset();
          
          // Set count to exceed limit
          const key = `ratelimit:user:${userId}:${Math.floor(Date.now() / 60000)}`;
          mockRedisService.setCount(key, requestCount);

          const context = createMockContext(userId);
          
          try {
            await guard.canActivate(context);
            fail('Expected HttpException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Rate limit response should include valid retry-after header
   */
  it('should include valid retry-after in rate limit response', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 101, max: 500 }),
        fc.uuid(),
        fc.integer({ min: 1, max: 60 }),
        async (requestCount, userId, ttlSeconds) => {
          mockRedisService.reset();
          
          const key = `ratelimit:user:${userId}:${Math.floor(Date.now() / 60000)}`;
          mockRedisService.setCount(key, requestCount, ttlSeconds);

          const context = createMockContext(userId);
          
          try {
            await guard.canActivate(context);
            fail('Expected HttpException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            const response = (error as HttpException).getResponse() as any;
            
            // Retry-after should be a positive number
            expect(response.retryAfter).toBeDefined();
            expect(typeof response.retryAfter).toBe('number');
            expect(response.retryAfter).toBeGreaterThan(0);
            expect(response.retryAfter).toBeLessThanOrEqual(60);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Different users should have independent rate limits
   */
  it('should maintain independent rate limits per user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 50 }),
        async (userId1, userId2, requestCount) => {
          // Ensure different users
          fc.pre(userId1 !== userId2);
          
          mockRedisService.reset();
          
          // Set user1 at limit
          const key1 = `ratelimit:user:${userId1}:${Math.floor(Date.now() / 60000)}`;
          mockRedisService.setCount(key1, 100);

          // User2 should still be allowed
          const context2 = createMockContext(userId2);
          const result = await guard.canActivate(context2);
          
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Rate limit headers should be set correctly
   */
  it('should set correct rate limit headers', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 99 }),
        fc.uuid(),
        async (requestCount, userId) => {
          mockRedisService.reset();
          
          const key = `ratelimit:user:${userId}:${Math.floor(Date.now() / 60000)}`;
          mockRedisService.setCount(key, requestCount);

          const context = createMockContext(userId);
          const response = context.switchToHttp().getResponse();
          
          await guard.canActivate(context);
          
          // Verify headers were set
          expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
          expect(response.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Remaining',
            expect.any(Number),
          );
          expect(response.setHeader).toHaveBeenCalledWith(
            'X-RateLimit-Reset',
            expect.any(Number),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: IP-based rate limiting for unauthenticated requests
   */
  it('should use IP for rate limiting unauthenticated requests', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.ipV4(),
        fc.integer({ min: 101, max: 200 }),
        async (ip, requestCount) => {
          mockRedisService.reset();
          
          const key = `ratelimit:ip:${ip}:${Math.floor(Date.now() / 60000)}`;
          mockRedisService.setCount(key, requestCount);

          const context = createMockContext(undefined, ip);
          
          try {
            await guard.canActivate(context);
            fail('Expected HttpException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Boundary condition - exactly at limit should be allowed
   */
  it('should allow request at exactly the limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (userId) => {
          mockRedisService.reset();
          
          // Set count to 99 (next request will be 100th)
          const key = `ratelimit:user:${userId}:${Math.floor(Date.now() / 60000)}`;
          mockRedisService.setCount(key, 99);

          const context = createMockContext(userId);
          const result = await guard.canActivate(context);
          
          // 100th request should be allowed
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: First request over limit should be rejected
   */
  it('should reject the 101st request', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (userId) => {
          mockRedisService.reset();
          
          // Set count to exactly 100
          const key = `ratelimit:user:${userId}:${Math.floor(Date.now() / 60000)}`;
          mockRedisService.setCount(key, 100);

          const context = createMockContext(userId);
          
          try {
            await guard.canActivate(context);
            fail('Expected HttpException to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
