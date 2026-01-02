"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitGuard = exports.SKIP_RATE_LIMIT_KEY = exports.RATE_LIMIT_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const redis_service_1 = require("../../database/redis.service");
exports.RATE_LIMIT_KEY = 'rateLimit';
exports.SKIP_RATE_LIMIT_KEY = 'skipRateLimit';
let RateLimitGuard = class RateLimitGuard {
    constructor(reflector, redisService, configService) {
        this.reflector = reflector;
        this.redisService = redisService;
        this.configService = configService;
        this.defaultLimit = this.configService.get('RATE_LIMIT_MAX', 100);
        this.defaultWindowSeconds = this.configService.get('RATE_LIMIT_WINDOW_SECONDS', 60);
    }
    async canActivate(context) {
        const skipRateLimit = this.reflector.getAllAndOverride(exports.SKIP_RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
        if (skipRateLimit) {
            return true;
        }
        const options = this.reflector.getAllAndOverride(exports.RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);
        const limit = options?.limit ?? this.defaultLimit;
        const windowSeconds = options?.windowSeconds ?? this.defaultWindowSeconds;
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const identifier = this.getIdentifier(request);
        const key = this.getRateLimitKey(identifier);
        try {
            const result = await this.checkRateLimit(key, limit, windowSeconds);
            response.setHeader('X-RateLimit-Limit', limit);
            response.setHeader('X-RateLimit-Remaining', Math.max(0, limit - result.count));
            response.setHeader('X-RateLimit-Reset', result.resetTime);
            if (result.isLimited) {
                response.setHeader('Retry-After', result.retryAfter);
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS,
                    error: 'Too Many Requests',
                    message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
                    retryAfter: result.retryAfter,
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            return true;
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            console.error('Rate limit check failed:', error);
            return true;
        }
    }
    getIdentifier(request) {
        if (request.user?.userId) {
            return `user:${request.user.userId}`;
        }
        const ip = request.ip ||
            request.headers['x-forwarded-for']?.split(',')[0] ||
            request.connection?.remoteAddress ||
            'unknown';
        return `ip:${ip}`;
    }
    getRateLimitKey(identifier) {
        const currentMinute = Math.floor(Date.now() / 60000);
        return `ratelimit:${identifier}:${currentMinute}`;
    }
    async checkRateLimit(key, limit, windowSeconds) {
        const count = await this.redisService.incr(key);
        if (count === 1) {
            await this.redisService.expire(key, windowSeconds);
        }
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
};
exports.RateLimitGuard = RateLimitGuard;
exports.RateLimitGuard = RateLimitGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        redis_service_1.RedisService,
        config_1.ConfigService])
], RateLimitGuard);
//# sourceMappingURL=rate-limit.guard.js.map