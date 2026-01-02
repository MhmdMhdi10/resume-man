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
var ApplicationQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationQueueService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../database/redis.service");
let ApplicationQueueService = ApplicationQueueService_1 = class ApplicationQueueService {
    constructor(redisService) {
        this.redisService = redisService;
        this.logger = new common_1.Logger(ApplicationQueueService_1.name);
        this.QUEUE_KEY = 'queue:applications';
        this.PROCESSING_LOCK_PREFIX = 'queue:processing:';
        this.USER_PROCESSING_PREFIX = 'queue:user_processing:';
        this.LOCK_TTL_SECONDS = 300;
    }
    async enqueue(item) {
        const serialized = JSON.stringify({
            ...item,
            queuedAt: item.queuedAt.toISOString(),
        });
        await this.redisService.getClient().rpush(this.QUEUE_KEY, serialized);
        this.logger.debug(`Enqueued application ${item.applicationId} for user ${item.userId}`);
    }
    async enqueueBatch(items) {
        if (items.length === 0)
            return;
        const serialized = items.map((item) => JSON.stringify({
            ...item,
            queuedAt: item.queuedAt.toISOString(),
        }));
        await this.redisService.getClient().rpush(this.QUEUE_KEY, ...serialized);
        this.logger.debug(`Enqueued ${items.length} applications`);
    }
    async dequeue() {
        const client = this.redisService.getClient();
        const items = await client.lrange(this.QUEUE_KEY, 0, 9);
        for (const serialized of items) {
            const item = this.deserializeItem(serialized);
            if (!item)
                continue;
            const userLockKey = `${this.USER_PROCESSING_PREFIX}${item.userId}`;
            const userHasProcessing = await client.get(userLockKey);
            if (userHasProcessing) {
                continue;
            }
            const lockKey = `${this.PROCESSING_LOCK_PREFIX}${item.applicationId}`;
            const lockAcquired = await client.set(lockKey, '1', 'EX', this.LOCK_TTL_SECONDS, 'NX');
            if (!lockAcquired) {
                continue;
            }
            await client.set(userLockKey, item.applicationId, 'EX', this.LOCK_TTL_SECONDS);
            await client.lrem(this.QUEUE_KEY, 1, serialized);
            this.logger.debug(`Dequeued application ${item.applicationId} for processing`);
            return item;
        }
        return null;
    }
    async releaseLock(applicationId, userId) {
        const client = this.redisService.getClient();
        const lockKey = `${this.PROCESSING_LOCK_PREFIX}${applicationId}`;
        const userLockKey = `${this.USER_PROCESSING_PREFIX}${userId}`;
        await client.del(lockKey);
        await client.del(userLockKey);
        this.logger.debug(`Released lock for application ${applicationId}`);
    }
    async requeue(item) {
        await this.releaseLock(item.applicationId, item.userId);
        await this.enqueue({
            ...item,
            queuedAt: new Date(),
        });
        this.logger.debug(`Re-queued application ${item.applicationId}`);
    }
    async getQueueLength() {
        return this.redisService.llen(this.QUEUE_KEY);
    }
    async getQueueItems(start = 0, stop = -1) {
        const items = await this.redisService.lrange(this.QUEUE_KEY, start, stop);
        return items
            .map((item) => this.deserializeItem(item))
            .filter((item) => item !== null);
    }
    async removeFromQueue(applicationId) {
        const items = await this.redisService.lrange(this.QUEUE_KEY, 0, -1);
        for (const serialized of items) {
            const item = this.deserializeItem(serialized);
            if (item && item.applicationId === applicationId) {
                const removed = await this.redisService.getClient().lrem(this.QUEUE_KEY, 1, serialized);
                if (removed > 0) {
                    this.logger.debug(`Removed application ${applicationId} from queue`);
                    return true;
                }
            }
        }
        return false;
    }
    async isProcessing(applicationId) {
        const lockKey = `${this.PROCESSING_LOCK_PREFIX}${applicationId}`;
        const lock = await this.redisService.get(lockKey);
        return lock !== null;
    }
    async isUserProcessing(userId) {
        const userLockKey = `${this.USER_PROCESSING_PREFIX}${userId}`;
        const lock = await this.redisService.get(userLockKey);
        return lock !== null;
    }
    deserializeItem(serialized) {
        try {
            const parsed = JSON.parse(serialized);
            return {
                ...parsed,
                queuedAt: new Date(parsed.queuedAt),
            };
        }
        catch (error) {
            this.logger.error(`Failed to deserialize queue item: ${error}`);
            return null;
        }
    }
};
exports.ApplicationQueueService = ApplicationQueueService;
exports.ApplicationQueueService = ApplicationQueueService = ApplicationQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [redis_service_1.RedisService])
], ApplicationQueueService);
//# sourceMappingURL=application-queue.service.js.map