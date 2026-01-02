import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../database/redis.service';

export const RATE_LIMIT_KEY = 'rateLimit';
export const SKIP_RATE_LIMIT_KEY = 'skipRateLimit';

export interface RateLimitOptions {
  limit?: number;
  windowSeconds?: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly defaultLimit: number;
  private readonly defaultWindowSeconds: number;

  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.defaultLimit = this.configService.get<number>('RATE_LIMIT_MAX', 100);
    this.defaultWindowSeconds = this.configService.get<number>('RATE_LIMIT_WINDOW_SECONDS', 60);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if rate limiting should be skipped for this route
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(
      SKIP_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipRateLimit) {
      return true;
    }

    // Get custom rate limit options if specified
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    const limit = options?.limit ?? this.defaultLimit;
    const windowSeconds = options?.windowSeconds ?? this.defaultWindowSeconds;

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get identifier: authenticated user ID or IP address
    const identifier = this.getIdentifier(request);
    const key = this.getRateLimitKey(identifier);

    try {
      const result = await this.checkRateLimit(key, limit, windowSeconds);

      // Set rate limit headers
      response.setHeader('X-RateLimit-Limit', limit);
      response.setHeader('X-RateLimit-Remaining', Math.max(0, limit - result.count));
      response.setHeader('X-RateLimit-Reset', result.resetTime);

      if (result.isLimited) {
        response.setHeader('Retry-After', result.retryAfter);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
            retryAfter: result.retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      // If Redis is unavailable, allow the request (fail open)
      console.error('Rate limit check failed:', error);
      return true;
    }
  }

  private getIdentifier(request: any): string {
    // Prefer authenticated user ID
    if (request.user?.userId) {
      return `user:${request.user.userId}`;
    }
    // Fall back to IP address
    const ip = request.ip || 
               request.headers['x-forwarded-for']?.split(',')[0] || 
               request.connection?.remoteAddress ||
               'unknown';
    return `ip:${ip}`;
  }

  private getRateLimitKey(identifier: string): string {
    const currentMinute = Math.floor(Date.now() / 60000);
    return `ratelimit:${identifier}:${currentMinute}`;
  }

  private async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{
    count: number;
    isLimited: boolean;
    retryAfter: number;
    resetTime: number;
  }> {
    // Increment the counter
    const count = await this.redisService.incr(key);

    // Set expiry on first request
    if (count === 1) {
      await this.redisService.expire(key, windowSeconds);
    }

    // Get TTL for retry-after calculation
    let ttl = await this.redisService.ttl(key);
    if (ttl < 0) {
      ttl = windowSeconds;
    }

    const resetTime = Math.floor(Date.now() / 1000) + ttl;
    const isLimited = count > limit;

    return {
      count,
      isLimited,
      retryAfter: ttl,
      resetTime,
    };
  }
}
