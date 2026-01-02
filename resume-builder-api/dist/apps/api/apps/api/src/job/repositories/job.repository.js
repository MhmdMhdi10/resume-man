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
var JobRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const job_schema_1 = require("../schemas/job.schema");
const redis_service_1 = require("../../database/redis.service");
let JobRepository = JobRepository_1 = class JobRepository {
    constructor(jobModel, redisService) {
        this.jobModel = jobModel;
        this.redisService = redisService;
        this.logger = new common_1.Logger(JobRepository_1.name);
        this.CACHE_TTL = 300;
        this.CACHE_PREFIX = 'jobs:';
    }
    async findById(id) {
        const cacheKey = `${this.CACHE_PREFIX}detail:${id}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for job ${id}`);
            return JSON.parse(cached);
        }
        const job = await this.jobModel.findById(id).exec();
        if (job) {
            await this.redisService.set(cacheKey, JSON.stringify(job), this.CACHE_TTL * 12);
        }
        return job;
    }
    async findByJabinjaId(jabinjaId) {
        return this.jobModel.findOne({ jabinjaId }).exec();
    }
    async search(filters, page = 1, limit = 20) {
        const cacheKey = this.buildSearchCacheKey(filters, page, limit);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for search`);
            return JSON.parse(cached);
        }
        const query = this.buildSearchQuery(filters);
        const skip = (page - 1) * limit;
        const [jobs, total] = await Promise.all([
            this.jobModel
                .find(query)
                .sort({ postedAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.jobModel.countDocuments(query).exec(),
        ]);
        const result = {
            jobs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
        await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
        return result;
    }
    buildSearchQuery(filters) {
        const query = {};
        if (filters.keyword) {
            query.$text = { $search: filters.keyword };
        }
        if (filters.location) {
            query.location = { $regex: filters.location, $options: 'i' };
        }
        if (filters.category) {
            query.category = { $regex: filters.category, $options: 'i' };
        }
        if (filters.experienceLevel) {
            query.experienceLevel = filters.experienceLevel;
        }
        return query;
    }
    buildSearchCacheKey(filters, page, limit) {
        const filterHash = JSON.stringify({
            ...filters,
            page,
            limit,
        });
        return `${this.CACHE_PREFIX}search:${Buffer.from(filterHash).toString('base64')}`;
    }
    async upsertFromJabinja(jabinjaJob) {
        const jobData = {
            jabinjaId: jabinjaJob.id,
            title: jabinjaJob.title,
            company: jabinjaJob.company,
            location: jabinjaJob.location,
            description: jabinjaJob.description,
            requirements: jabinjaJob.requirements,
            category: jabinjaJob.category,
            experienceLevel: jabinjaJob.experienceLevel,
            applicationUrl: jabinjaJob.applicationUrl,
            postedAt: jabinjaJob.postedAt,
            syncedAt: new Date(),
        };
        const job = await this.jobModel.findOneAndUpdate({ jabinjaId: jabinjaJob.id }, { $set: jobData }, { upsert: true, new: true }).exec();
        await this.invalidateSearchCache();
        return job;
    }
    async bulkUpsertFromJabinja(jabinjaJobs) {
        if (jabinjaJobs.length === 0)
            return 0;
        const operations = jabinjaJobs.map((job) => ({
            updateOne: {
                filter: { jabinjaId: job.id },
                update: {
                    $set: {
                        jabinjaId: job.id,
                        title: job.title,
                        company: job.company,
                        location: job.location,
                        description: job.description,
                        requirements: job.requirements,
                        category: job.category,
                        experienceLevel: job.experienceLevel,
                        applicationUrl: job.applicationUrl,
                        postedAt: job.postedAt,
                        syncedAt: new Date(),
                    },
                },
                upsert: true,
            },
        }));
        const result = await this.jobModel.bulkWrite(operations);
        await this.invalidateSearchCache();
        return result.upsertedCount + result.modifiedCount;
    }
    async invalidateSearchCache() {
        this.logger.debug('Invalidating search cache');
    }
    async getRecentJobs(limit = 10) {
        return this.jobModel
            .find()
            .sort({ postedAt: -1 })
            .limit(limit)
            .exec();
    }
    async countByCategory() {
        const result = await this.jobModel.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
        ]).exec();
        return result.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});
    }
};
exports.JobRepository = JobRepository;
exports.JobRepository = JobRepository = JobRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(job_schema_1.Job.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        redis_service_1.RedisService])
], JobRepository);
//# sourceMappingURL=job.repository.js.map