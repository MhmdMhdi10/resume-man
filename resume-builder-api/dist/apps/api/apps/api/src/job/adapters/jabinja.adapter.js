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
var JabinjaAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JabinjaAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const shared_1 = require("../../../../../libs/shared/src");
const retry_util_1 = require("../utils/retry.util");
const circuit_breaker_util_1 = require("../utils/circuit-breaker.util");
let JabinjaAdapter = JabinjaAdapter_1 = class JabinjaAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(JabinjaAdapter_1.name);
        this.cachedJobs = [];
        this.baseUrl = this.configService.get('JABINJA_API_URL', 'https://api.jabinja.com');
        this.apiKey = this.configService.get('JABINJA_API_KEY', '');
        this.retryConfig = {
            maxRetries: this.configService.get('JABINJA_MAX_RETRIES', 3),
            baseDelayMs: this.configService.get('JABINJA_BASE_DELAY_MS', 1000),
            maxDelayMs: this.configService.get('JABINJA_MAX_DELAY_MS', 30000),
            jitterFactor: 0.1,
        };
        const circuitBreakerConfig = {
            failureThreshold: this.configService.get('JABINJA_CB_FAILURE_THRESHOLD', 5),
            failureWindowMs: this.configService.get('JABINJA_CB_FAILURE_WINDOW_MS', 60000),
            openDurationMs: this.configService.get('JABINJA_CB_OPEN_DURATION_MS', 30000),
        };
        this.circuitBreaker = new circuit_breaker_util_1.CircuitBreaker('jabinja-jobs', circuitBreakerConfig, () => this.getFallbackJobs());
        this.submissionCircuitBreaker = new circuit_breaker_util_1.CircuitBreaker('jabinja-submission', circuitBreakerConfig);
    }
    async getFallbackJobs() {
        this.logger.warn('Using cached jobs as fallback');
        return this.cachedJobs;
    }
    setCachedJobs(jobs) {
        this.cachedJobs = jobs;
    }
    async fetchJobs(params) {
        this.logger.debug(`Fetching jobs with params: ${JSON.stringify(params)}`);
        const jobs = await this.circuitBreaker.execute(async () => {
            const result = await this.fetchJobsWithRetry(params);
            if (!result.success) {
                this.logger.error(`Failed to fetch jobs after ${result.attempts} attempts`);
                throw result.error;
            }
            return result.data;
        });
        if (jobs.length > 0) {
            this.cachedJobs = jobs;
        }
        return jobs;
    }
    async fetchJobsWithRetry(params) {
        return (0, retry_util_1.withRetry)(() => this.doFetchJobs(params), this.retryConfig, this.logger);
    }
    async doFetchJobs(params) {
        const queryParams = new URLSearchParams();
        if (params.query)
            queryParams.append('q', params.query);
        if (params.location)
            queryParams.append('location', params.location);
        if (params.category)
            queryParams.append('category', params.category);
        queryParams.append('page', params.page.toString());
        const url = `${this.baseUrl}/jobs?${queryParams.toString()}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Jabinja API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return this.mapJabinjaResponse(data);
    }
    async submitApplication(jobId, application) {
        this.logger.debug(`Submitting application for job: ${jobId}`);
        try {
            return await this.submissionCircuitBreaker.execute(async () => {
                const result = await this.submitApplicationWithRetry(jobId, application);
                if (!result.success) {
                    throw result.error || new Error('Unknown error after retries');
                }
                return result.data;
            });
        }
        catch (error) {
            return {
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async submitApplicationWithRetry(jobId, application) {
        return (0, retry_util_1.withRetry)(() => this.doSubmitApplication(jobId, application), this.retryConfig, this.logger);
    }
    async doSubmitApplication(jobId, application) {
        const formData = new FormData();
        formData.append('resume', new Blob([new Uint8Array(application.resumeFile)], { type: 'application/pdf' }), 'resume.pdf');
        formData.append('firstName', application.applicantInfo.firstName);
        formData.append('lastName', application.applicantInfo.lastName);
        formData.append('email', application.applicantInfo.email);
        formData.append('phone', application.applicantInfo.phone);
        if (application.coverLetter) {
            formData.append('coverLetter', application.coverLetter);
        }
        const url = `${this.baseUrl}/jobs/${jobId}/apply`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return {
            success: true,
            confirmationId: data.confirmationId || data.id,
        };
    }
    mapJabinjaResponse(data) {
        const jobs = Array.isArray(data) ? data : data.jobs || data.results || [];
        return jobs.map((job) => ({
            id: job.id || job._id,
            title: job.title || job.jobTitle,
            company: job.company || job.companyName,
            location: job.location || job.city,
            description: job.description || job.jobDescription || '',
            requirements: this.parseRequirements(job.requirements),
            category: job.category || job.jobCategory || 'general',
            experienceLevel: this.mapExperienceLevel(job.experienceLevel || job.level),
            postedAt: new Date(job.postedAt || job.createdAt || job.publishedDate),
            applicationUrl: job.applicationUrl || job.applyUrl || `${this.baseUrl}/jobs/${job.id}/apply`,
        }));
    }
    parseRequirements(requirements) {
        if (Array.isArray(requirements)) {
            return requirements.map((r) => (typeof r === 'string' ? r : r.text || r.description));
        }
        if (typeof requirements === 'string') {
            return requirements.split(/[,;\n]/).map((r) => r.trim()).filter(Boolean);
        }
        return [];
    }
    mapExperienceLevel(level) {
        const levelMap = {
            entry: shared_1.ExperienceLevel.ENTRY,
            junior: shared_1.ExperienceLevel.ENTRY,
            mid: shared_1.ExperienceLevel.MID,
            middle: shared_1.ExperienceLevel.MID,
            intermediate: shared_1.ExperienceLevel.MID,
            senior: shared_1.ExperienceLevel.SENIOR,
            lead: shared_1.ExperienceLevel.LEAD,
            principal: shared_1.ExperienceLevel.LEAD,
            staff: shared_1.ExperienceLevel.LEAD,
        };
        const normalizedLevel = (level || '').toLowerCase().trim();
        return levelMap[normalizedLevel] || shared_1.ExperienceLevel.MID;
    }
};
exports.JabinjaAdapter = JabinjaAdapter;
exports.JabinjaAdapter = JabinjaAdapter = JabinjaAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], JabinjaAdapter);
//# sourceMappingURL=jabinja.adapter.js.map