import { SetMetadata } from '@nestjs/common';
import { RATE_LIMIT_KEY, SKIP_RATE_LIMIT_KEY, RateLimitOptions } from '../guards/rate-limit.guard';

/**
 * Decorator to set custom rate limit options for a route or controller
 * @param options - Custom rate limit configuration
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Decorator to skip rate limiting for a route or controller
 */
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
