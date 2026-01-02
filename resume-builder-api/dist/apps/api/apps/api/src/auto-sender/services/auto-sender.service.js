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
var AutoSenderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoSenderService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const shared_1 = require("../../../../../libs/shared/src");
const application_schema_1 = require("../schemas/application.schema");
const application_queue_service_1 = require("./application-queue.service");
let AutoSenderService = AutoSenderService_1 = class AutoSenderService {
    constructor(applicationModel, queueService) {
        this.applicationModel = applicationModel;
        this.queueService = queueService;
        this.logger = new common_1.Logger(AutoSenderService_1.name);
    }
    async queueApplications(userId, dto) {
        const batchId = (0, uuid_1.v4)();
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const resumeObjectId = new mongoose_2.Types.ObjectId(dto.resumeId);
        const applications = [];
        const queueItems = [];
        for (const jobId of dto.jobIds) {
            const jobObjectId = new mongoose_2.Types.ObjectId(jobId);
            const existing = await this.applicationModel.findOne({
                userId: userObjectId,
                jobId: jobObjectId,
                status: { $nin: [shared_1.ApplicationStatus.FAILED, shared_1.ApplicationStatus.CANCELLED] },
            });
            if (existing) {
                this.logger.warn(`Application already exists for user ${userId} and job ${jobId}`);
                continue;
            }
            const application = new this.applicationModel({
                userId: userObjectId,
                jobId: jobObjectId,
                resumeId: resumeObjectId,
                batchId,
                status: shared_1.ApplicationStatus.PENDING,
                coverLetter: dto.coverLetter,
            });
            const saved = await application.save();
            applications.push(saved);
            queueItems.push({
                applicationId: saved._id.toString(),
                userId,
                jobId,
                resumeId: dto.resumeId,
                queuedAt: new Date(),
            });
        }
        if (queueItems.length > 0) {
            await this.queueService.enqueueBatch(queueItems);
        }
        this.logger.log(`Queued ${applications.length} applications in batch ${batchId}`);
        return {
            batchId,
            applications: applications.map((app) => ({
                id: app._id.toString(),
                jobId: app.jobId.toString(),
                status: app.status,
                queuedAt: app.createdAt,
            })),
            totalCount: applications.length,
        };
    }
    async getApplicationStatus(userId, applicationId) {
        const application = await this.applicationModel.findOne({
            _id: new mongoose_2.Types.ObjectId(applicationId),
            userId: new mongoose_2.Types.ObjectId(userId),
        });
        if (!application) {
            throw new common_1.NotFoundException(`Application ${applicationId} not found`);
        }
        return application;
    }
    async getApplications(userId, filters = {}, page = 1, limit = 20) {
        const query = { userId: new mongoose_2.Types.ObjectId(userId) };
        if (filters.status) {
            query.status = filters.status;
        }
        if (filters.jobId) {
            query.jobId = new mongoose_2.Types.ObjectId(filters.jobId);
        }
        if (filters.batchId) {
            query.batchId = filters.batchId;
        }
        if (filters.fromDate || filters.toDate) {
            query.createdAt = {};
            if (filters.fromDate) {
                query.createdAt.$gte = filters.fromDate;
            }
            if (filters.toDate) {
                query.createdAt.$lte = filters.toDate;
            }
        }
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.applicationModel
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.applicationModel.countDocuments(query),
        ]);
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async cancelApplication(userId, applicationId) {
        const application = await this.applicationModel.findOne({
            _id: new mongoose_2.Types.ObjectId(applicationId),
            userId: new mongoose_2.Types.ObjectId(userId),
        });
        if (!application) {
            throw new common_1.NotFoundException(`Application ${applicationId} not found`);
        }
        if (!(0, application_schema_1.isValidStatusTransition)(application.status, shared_1.ApplicationStatus.CANCELLED)) {
            throw new common_1.BadRequestException(`Cannot cancel application in ${application.status} status`);
        }
        if (application.status === shared_1.ApplicationStatus.PENDING) {
            await this.queueService.removeFromQueue(applicationId);
        }
        application.status = shared_1.ApplicationStatus.CANCELLED;
        await application.save();
        this.logger.log(`Cancelled application ${applicationId}`);
        return application;
    }
    async updateApplicationStatus(applicationId, newStatus, additionalData) {
        const application = await this.applicationModel.findById(applicationId);
        if (!application) {
            throw new common_1.NotFoundException(`Application ${applicationId} not found`);
        }
        if (!(0, application_schema_1.isValidStatusTransition)(application.status, newStatus)) {
            throw new common_1.BadRequestException(`Invalid status transition from ${application.status} to ${newStatus}`);
        }
        application.status = newStatus;
        if (additionalData?.confirmationId) {
            application.confirmationId = additionalData.confirmationId;
        }
        if (additionalData?.errorMessage) {
            application.errorMessage = additionalData.errorMessage;
        }
        if (additionalData?.submittedAt) {
            application.submittedAt = additionalData.submittedAt;
        }
        await application.save();
        this.logger.debug(`Updated application ${applicationId} status to ${newStatus}`);
        return application;
    }
    async incrementRetryCount(applicationId) {
        const application = await this.applicationModel.findByIdAndUpdate(applicationId, { $inc: { retryCount: 1 } }, { new: true });
        if (!application) {
            throw new common_1.NotFoundException(`Application ${applicationId} not found`);
        }
        return application.retryCount;
    }
    async getApplicationById(applicationId) {
        return this.applicationModel.findById(applicationId);
    }
    async getApplicationsByBatchId(userId, batchId) {
        return this.applicationModel.find({
            userId: new mongoose_2.Types.ObjectId(userId),
            batchId,
        });
    }
};
exports.AutoSenderService = AutoSenderService;
exports.AutoSenderService = AutoSenderService = AutoSenderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(application_schema_1.Application.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        application_queue_service_1.ApplicationQueueService])
], AutoSenderService);
//# sourceMappingURL=auto-sender.service.js.map