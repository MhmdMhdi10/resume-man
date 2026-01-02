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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DashboardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shared_1 = require("../../../../../libs/shared/src");
const application_schema_1 = require("../../auto-sender/schemas/application.schema");
const redis_service_1 = require("../../database/redis.service");
let DashboardService = DashboardService_1 = class DashboardService {
    constructor(applicationModel, redisService) {
        this.applicationModel = applicationModel;
        this.redisService = redisService;
        this.logger = new common_1.Logger(DashboardService_1.name);
        this.CACHE_TTL = 300;
    }
    async getApplicationStats(userId) {
        const cacheKey = `dashboard:stats:${userId}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for stats: ${userId}`);
            return JSON.parse(cached);
        }
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const [statusCounts] = await this.applicationModel.aggregate([
            { $match: { userId: userObjectId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);
        const stats = this.calculateStats(statusCounts ? [statusCounts] : []);
        if (!statusCounts) {
            const allStatusCounts = await this.applicationModel.aggregate([
                { $match: { userId: userObjectId } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]);
            const calculatedStats = this.calculateStats(allStatusCounts);
            await this.redisService.set(cacheKey, JSON.stringify(calculatedStats), this.CACHE_TTL);
            return calculatedStats;
        }
        const allStatusCounts = await this.applicationModel.aggregate([
            { $match: { userId: userObjectId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);
        const calculatedStats = this.calculateStats(allStatusCounts);
        await this.redisService.set(cacheKey, JSON.stringify(calculatedStats), this.CACHE_TTL);
        this.logger.debug(`Calculated stats for user ${userId}: ${JSON.stringify(calculatedStats)}`);
        return calculatedStats;
    }
    calculateStats(statusCounts) {
        let totalApplications = 0;
        let submittedCount = 0;
        let pendingCount = 0;
        let failedCount = 0;
        for (const item of statusCounts) {
            totalApplications += item.count;
            switch (item._id) {
                case shared_1.ApplicationStatus.SUBMITTED:
                    submittedCount = item.count;
                    break;
                case shared_1.ApplicationStatus.PENDING:
                case shared_1.ApplicationStatus.PROCESSING:
                    pendingCount += item.count;
                    break;
                case shared_1.ApplicationStatus.FAILED:
                    failedCount = item.count;
                    break;
            }
        }
        const successRate = totalApplications > 0
            ? Math.round((submittedCount / totalApplications) * 100 * 100) / 100
            : 0;
        return {
            totalApplications,
            submittedCount,
            pendingCount,
            failedCount,
            successRate,
        };
    }
    async getApplicationTimeline(userId, days = 30) {
        const cacheKey = `dashboard:timeline:${userId}:${days}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for timeline: ${userId}`);
            return JSON.parse(cached);
        }
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
        const timelineData = await this.applicationModel.aggregate([
            {
                $match: {
                    userId: userObjectId,
                    createdAt: { $gte: startDate },
                    status: { $in: [shared_1.ApplicationStatus.SUBMITTED, shared_1.ApplicationStatus.FAILED] },
                },
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        status: '$status',
                    },
                    count: { $sum: 1 },
                },
            },
            {
                $group: {
                    _id: '$_id.date',
                    statuses: {
                        $push: {
                            status: '$_id.status',
                            count: '$count',
                        },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        const result = timelineData.map((item) => {
            let submitted = 0;
            let failed = 0;
            for (const status of item.statuses) {
                if (status.status === shared_1.ApplicationStatus.SUBMITTED) {
                    submitted = status.count;
                }
                else if (status.status === shared_1.ApplicationStatus.FAILED) {
                    failed = status.count;
                }
            }
            return {
                date: new Date(item._id),
                submitted,
                failed,
            };
        });
        await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
        this.logger.debug(`Calculated timeline for user ${userId}: ${result.length} days`);
        return result;
    }
    async invalidateCache(userId) {
        await this.redisService.del(`dashboard:stats:${userId}`);
        for (const days of [7, 14, 30, 60, 90]) {
            await this.redisService.del(`dashboard:timeline:${userId}:${days}`);
        }
        this.logger.debug(`Invalidated cache for user ${userId}`);
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = DashboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(application_schema_1.Application.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        redis_service_1.RedisService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map