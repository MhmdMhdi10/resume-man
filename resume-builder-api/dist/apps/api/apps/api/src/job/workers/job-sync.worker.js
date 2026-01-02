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
var JobSyncWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobSyncWorker = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const jabinja_adapter_1 = require("../adapters/jabinja.adapter");
const job_repository_1 = require("../repositories/job.repository");
let JobSyncWorker = JobSyncWorker_1 = class JobSyncWorker {
    constructor(configService, jabinjaAdapter, jobRepository) {
        this.configService = configService;
        this.jabinjaAdapter = jabinjaAdapter;
        this.jobRepository = jobRepository;
        this.logger = new common_1.Logger(JobSyncWorker_1.name);
        this.isSyncing = false;
        this.syncEnabled = this.configService.get('JOB_SYNC_ENABLED', false);
        this.pagesToSync = this.configService.get('JOB_SYNC_PAGES', 5);
    }
    async onModuleInit() {
        if (this.syncEnabled) {
            this.logger.log('Job sync worker initialized, will sync on schedule');
        }
        else {
            this.logger.log('Job sync worker disabled');
        }
    }
    async scheduledSync() {
        if (!this.syncEnabled) {
            return;
        }
        this.logger.log('Starting scheduled job sync');
        await this.syncJobs();
    }
    async syncJobs() {
        if (this.isSyncing) {
            this.logger.warn('Sync already in progress, skipping');
            return {
                success: false,
                jobsSynced: 0,
                errors: ['Sync already in progress'],
                duration: 0,
            };
        }
        this.isSyncing = true;
        const startTime = Date.now();
        const errors = [];
        let totalJobsSynced = 0;
        try {
            for (let page = 1; page <= this.pagesToSync; page++) {
                try {
                    this.logger.debug(`Syncing page ${page}`);
                    const jobs = await this.jabinjaAdapter.fetchJobs({ page });
                    if (jobs.length === 0) {
                        this.logger.debug(`No more jobs found at page ${page}, stopping sync`);
                        break;
                    }
                    const synced = await this.jobRepository.bulkUpsertFromJabinja(jobs);
                    totalJobsSynced += synced;
                    this.logger.debug(`Synced ${synced} jobs from page ${page}`);
                }
                catch (error) {
                    const errorMessage = `Failed to sync page ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    this.logger.error(errorMessage);
                    errors.push(errorMessage);
                }
            }
            const duration = Date.now() - startTime;
            this.logger.log(`Job sync completed: ${totalJobsSynced} jobs synced in ${duration}ms`);
            return {
                success: errors.length === 0,
                jobsSynced: totalJobsSynced,
                errors,
                duration,
            };
        }
        finally {
            this.isSyncing = false;
        }
    }
    async syncByCategory(category) {
        if (this.isSyncing) {
            return {
                success: false,
                jobsSynced: 0,
                errors: ['Sync already in progress'],
                duration: 0,
            };
        }
        this.isSyncing = true;
        const startTime = Date.now();
        const errors = [];
        let totalJobsSynced = 0;
        try {
            for (let page = 1; page <= this.pagesToSync; page++) {
                try {
                    const jobs = await this.jabinjaAdapter.fetchJobs({ category, page });
                    if (jobs.length === 0)
                        break;
                    const synced = await this.jobRepository.bulkUpsertFromJabinja(jobs);
                    totalJobsSynced += synced;
                }
                catch (error) {
                    errors.push(`Failed to sync category ${category} page ${page}`);
                }
            }
            return {
                success: errors.length === 0,
                jobsSynced: totalJobsSynced,
                errors,
                duration: Date.now() - startTime,
            };
        }
        finally {
            this.isSyncing = false;
        }
    }
};
exports.JobSyncWorker = JobSyncWorker;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], JobSyncWorker.prototype, "scheduledSync", null);
exports.JobSyncWorker = JobSyncWorker = JobSyncWorker_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        jabinja_adapter_1.JabinjaAdapter,
        job_repository_1.JobRepository])
], JobSyncWorker);
//# sourceMappingURL=job-sync.worker.js.map