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
var ApplicationWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationWorker = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shared_1 = require("../../../../../libs/shared/src");
const application_schema_1 = require("../schemas/application.schema");
const application_queue_service_1 = require("../services/application-queue.service");
const auto_sender_service_1 = require("../services/auto-sender.service");
const jabinja_adapter_1 = require("../../job/adapters/jabinja.adapter");
const resume_schema_1 = require("../../resume/schemas/resume.schema");
const profile_schema_1 = require("../../profile/schemas/profile.schema");
const storage_service_1 = require("../../resume/services/storage.service");
const notification_service_1 = require("../../notification/services/notification.service");
let ApplicationWorker = ApplicationWorker_1 = class ApplicationWorker {
    constructor(configService, queueService, autoSenderService, jabinjaAdapter, storageService, notificationService, resumeModel, profileModel, applicationModel) {
        this.configService = configService;
        this.queueService = queueService;
        this.autoSenderService = autoSenderService;
        this.jabinjaAdapter = jabinjaAdapter;
        this.storageService = storageService;
        this.notificationService = notificationService;
        this.resumeModel = resumeModel;
        this.profileModel = profileModel;
        this.applicationModel = applicationModel;
        this.logger = new common_1.Logger(ApplicationWorker_1.name);
        this.isRunning = false;
        this.pollTimeout = null;
        this.maxRetries = this.configService.get('APPLICATION_MAX_RETRIES', 3);
        this.pollIntervalMs = this.configService.get('APPLICATION_POLL_INTERVAL_MS', 5000);
    }
    async onModuleInit() {
        const autoStart = this.configService.get('APPLICATION_WORKER_AUTO_START', true);
        if (autoStart) {
            this.start();
        }
    }
    async onModuleDestroy() {
        this.stop();
    }
    start() {
        if (this.isRunning) {
            this.logger.warn('Worker is already running');
            return;
        }
        this.isRunning = true;
        this.logger.log('Application worker started');
        this.poll();
    }
    stop() {
        this.isRunning = false;
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }
        this.logger.log('Application worker stopped');
    }
    async poll() {
        if (!this.isRunning)
            return;
        try {
            await this.processQueue();
        }
        catch (error) {
            this.logger.error(`Error in poll cycle: ${error}`);
        }
        this.pollTimeout = setTimeout(() => this.poll(), this.pollIntervalMs);
    }
    async processQueue() {
        const item = await this.queueService.dequeue();
        if (!item) {
            return;
        }
        this.logger.debug(`Processing application ${item.applicationId}`);
        try {
            await this.autoSenderService.updateApplicationStatus(item.applicationId, shared_1.ApplicationStatus.PROCESSING);
            const result = await this.processApplication(item);
            if (result.success) {
                await this.autoSenderService.updateApplicationStatus(item.applicationId, shared_1.ApplicationStatus.SUBMITTED, {
                    confirmationId: result.confirmationId,
                    submittedAt: new Date(),
                });
                this.logger.log(`Application ${item.applicationId} submitted successfully`);
                await this.sendSubmissionNotification(item.userId, item.applicationId, item.jobId);
            }
            else if (result.shouldRetry) {
                await this.handleRetry(item, result.errorMessage);
            }
            else {
                await this.autoSenderService.updateApplicationStatus(item.applicationId, shared_1.ApplicationStatus.FAILED, { errorMessage: result.errorMessage });
                this.logger.warn(`Application ${item.applicationId} failed: ${result.errorMessage}`);
                await this.sendFailureNotification(item.userId, item.applicationId, item.jobId, result.errorMessage);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Error processing application ${item.applicationId}: ${errorMessage}`);
            await this.handleRetry(item, errorMessage);
        }
        finally {
            await this.queueService.releaseLock(item.applicationId, item.userId);
        }
    }
    async processApplication(item) {
        const application = await this.autoSenderService.getApplicationById(item.applicationId);
        if (!application) {
            return {
                success: false,
                shouldRetry: false,
                errorMessage: 'Application not found',
            };
        }
        const resume = await this.resumeModel.findById(application.resumeId);
        if (!resume) {
            return {
                success: false,
                shouldRetry: false,
                errorMessage: 'Resume not found',
            };
        }
        const profile = await this.profileModel.findOne({ userId: application.userId });
        if (!profile) {
            return {
                success: false,
                shouldRetry: false,
                errorMessage: 'User profile not found',
            };
        }
        let resumeBuffer;
        try {
            resumeBuffer = await this.storageService.getFile(resume.storageKey);
        }
        catch (error) {
            return {
                success: false,
                shouldRetry: false,
                errorMessage: 'Failed to download resume file',
            };
        }
        const payload = {
            resumeFile: resumeBuffer,
            coverLetter: application.coverLetter,
            applicantInfo: {
                firstName: profile.personalInfo?.firstName ?? '',
                lastName: profile.personalInfo?.lastName ?? '',
                email: profile.personalInfo?.email ?? '',
                phone: profile.personalInfo?.phone ?? '',
            },
        };
        const result = await this.jabinjaAdapter.submitApplication(application.jobId.toString(), payload);
        return {
            success: result.success,
            confirmationId: result.confirmationId,
            shouldRetry: !result.success,
            errorMessage: result.errorMessage,
        };
    }
    async handleRetry(item, errorMessage) {
        const retryCount = await this.autoSenderService.incrementRetryCount(item.applicationId);
        if (retryCount < this.maxRetries) {
            await this.autoSenderService.updateApplicationStatus(item.applicationId, shared_1.ApplicationStatus.PENDING, { errorMessage });
            await this.queueService.requeue(item);
            this.logger.debug(`Application ${item.applicationId} requeued for retry (${retryCount}/${this.maxRetries})`);
        }
        else {
            const finalErrorMessage = `Max retries exceeded. Last error: ${errorMessage}`;
            await this.autoSenderService.updateApplicationStatus(item.applicationId, shared_1.ApplicationStatus.FAILED, { errorMessage: finalErrorMessage });
            this.logger.warn(`Application ${item.applicationId} failed after ${this.maxRetries} retries`);
            await this.sendFailureNotification(item.userId, item.applicationId, item.jobId, finalErrorMessage);
        }
    }
    async sendSubmissionNotification(userId, applicationId, jobId) {
        try {
            await this.notificationService.sendNotification(userId, {
                type: shared_1.NotificationType.APPLICATION_SUBMITTED,
                title: 'Application Submitted',
                message: 'Your job application has been successfully submitted.',
                data: { applicationId, jobId },
                channels: [shared_1.NotificationChannel.IN_APP, shared_1.NotificationChannel.EMAIL],
            });
        }
        catch (error) {
            this.logger.error(`Failed to send submission notification: ${error}`);
        }
    }
    async sendFailureNotification(userId, applicationId, jobId, errorMessage) {
        try {
            await this.notificationService.sendNotification(userId, {
                type: shared_1.NotificationType.APPLICATION_FAILED,
                title: 'Application Failed',
                message: errorMessage || 'Your job application could not be submitted.',
                data: { applicationId, jobId, errorMessage },
                channels: [shared_1.NotificationChannel.IN_APP, shared_1.NotificationChannel.EMAIL],
            });
        }
        catch (error) {
            this.logger.error(`Failed to send failure notification: ${error}`);
        }
    }
    async sendBatchCompletionNotification(userId, batchId, stats) {
        try {
            await this.notificationService.sendNotification(userId, {
                type: shared_1.NotificationType.BATCH_COMPLETE,
                title: 'Batch Applications Complete',
                message: `Batch processing complete: ${stats.submitted} submitted, ${stats.failed} failed out of ${stats.total} applications.`,
                data: { batchId, ...stats },
                channels: [shared_1.NotificationChannel.IN_APP, shared_1.NotificationChannel.EMAIL],
            });
        }
        catch (error) {
            this.logger.error(`Failed to send batch completion notification: ${error}`);
        }
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            queueLength: this.queueService.getQueueLength(),
        };
    }
};
exports.ApplicationWorker = ApplicationWorker;
exports.ApplicationWorker = ApplicationWorker = ApplicationWorker_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, mongoose_1.InjectModel)(resume_schema_1.Resume.name)),
    __param(7, (0, mongoose_1.InjectModel)(profile_schema_1.Profile.name)),
    __param(8, (0, mongoose_1.InjectModel)(application_schema_1.Application.name)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        application_queue_service_1.ApplicationQueueService,
        auto_sender_service_1.AutoSenderService,
        jabinja_adapter_1.JabinjaAdapter,
        storage_service_1.StorageService,
        notification_service_1.NotificationService,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], ApplicationWorker);
//# sourceMappingURL=application.worker.js.map