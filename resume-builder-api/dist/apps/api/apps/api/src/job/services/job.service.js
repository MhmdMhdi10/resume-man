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
var JobService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobService = void 0;
const common_1 = require("@nestjs/common");
const job_repository_1 = require("../repositories/job.repository");
const job_sync_worker_1 = require("../workers/job-sync.worker");
let JobService = JobService_1 = class JobService {
    constructor(jobRepository, jobSyncWorker) {
        this.jobRepository = jobRepository;
        this.jobSyncWorker = jobSyncWorker;
        this.logger = new common_1.Logger(JobService_1.name);
    }
    async searchJobs(query) {
        this.logger.debug(`Searching jobs with query: ${JSON.stringify(query)}`);
        const filters = {
            keyword: query.keyword,
            location: query.location,
            category: query.category,
            experienceLevel: query.experienceLevel,
        };
        const result = await this.jobRepository.search(filters, query.page, query.limit);
        return {
            jobs: result.jobs.map(this.mapToJobListing),
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        };
    }
    async getJob(jobId) {
        const job = await this.jobRepository.findById(jobId);
        if (!job) {
            throw new common_1.NotFoundException(`Job with ID ${jobId} not found`);
        }
        return this.mapToJobListing(job);
    }
    async getJobByJabinjaId(jabinjaId) {
        const job = await this.jobRepository.findByJabinjaId(jabinjaId);
        return job ? this.mapToJobListing(job) : null;
    }
    async syncJobs() {
        return this.jobSyncWorker.syncJobs();
    }
    async syncJobsByCategory(category) {
        return this.jobSyncWorker.syncByCategory(category);
    }
    async getRecentJobs(limit = 10) {
        const jobs = await this.jobRepository.getRecentJobs(limit);
        return jobs.map(this.mapToJobListing);
    }
    async getCategoryStats() {
        return this.jobRepository.countByCategory();
    }
    filterJobs(jobs, filters) {
        return jobs.filter((job) => {
            if (filters.location) {
                const locationMatch = job.location
                    .toLowerCase()
                    .includes(filters.location.toLowerCase());
                if (!locationMatch)
                    return false;
            }
            if (filters.category) {
                const categoryMatch = job.category
                    .toLowerCase()
                    .includes(filters.category.toLowerCase());
                if (!categoryMatch)
                    return false;
            }
            if (filters.experienceLevel) {
                if (job.experienceLevel !== filters.experienceLevel)
                    return false;
            }
            if (filters.keyword) {
                const keyword = filters.keyword.toLowerCase();
                const keywordMatch = job.title.toLowerCase().includes(keyword) ||
                    job.company.toLowerCase().includes(keyword) ||
                    job.description.toLowerCase().includes(keyword);
                if (!keywordMatch)
                    return false;
            }
            return true;
        });
    }
    mapToJobListing(job) {
        return {
            id: job._id.toString(),
            jabinjaId: job.jabinjaId,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            requirements: job.requirements,
            category: job.category,
            experienceLevel: job.experienceLevel,
            postedAt: job.postedAt,
            applicationUrl: job.applicationUrl,
        };
    }
};
exports.JobService = JobService;
exports.JobService = JobService = JobService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [job_repository_1.JobRepository,
        job_sync_worker_1.JobSyncWorker])
], JobService);
//# sourceMappingURL=job.service.js.map