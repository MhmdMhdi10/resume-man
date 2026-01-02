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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = class RedisService {
    constructor(configService) {
        this.configService = configService;
    }
    async onModuleInit() {
        this.client = new ioredis_1.default({
            host: this.configService.get('REDIS_HOST', 'localhost'),
            port: this.configService.get('REDIS_PORT', 6379),
            password: this.configService.get('REDIS_PASSWORD', ''),
            db: this.configService.get('REDIS_DB', 0),
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                if (times > 3) {
                    return null;
                }
                return Math.min(times * 100, 3000);
            },
        });
        this.client.on('error', (err) => {
            console.error('Redis connection error:', err);
        });
        this.client.on('connect', () => {
            console.log('Redis connected successfully');
        });
    }
    async onModuleDestroy() {
        if (this.client) {
            await this.client.quit();
        }
    }
    getClient() {
        return this.client;
    }
    async get(key) {
        return this.client.get(key);
    }
    async set(key, value, ttlSeconds) {
        if (ttlSeconds) {
            await this.client.setex(key, ttlSeconds, value);
        }
        else {
            await this.client.set(key, value);
        }
    }
    async del(key) {
        await this.client.del(key);
    }
    async incr(key) {
        return this.client.incr(key);
    }
    async expire(key, seconds) {
        await this.client.expire(key, seconds);
    }
    async ttl(key) {
        return this.client.ttl(key);
    }
    async lpush(key, ...values) {
        return this.client.lpush(key, ...values);
    }
    async rpop(key) {
        return this.client.rpop(key);
    }
    async llen(key) {
        return this.client.llen(key);
    }
    async lrange(key, start, stop) {
        return this.client.lrange(key, start, stop);
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map