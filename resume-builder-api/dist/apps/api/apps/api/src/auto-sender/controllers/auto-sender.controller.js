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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoSenderController = void 0;
const common_1 = require("@nestjs/common");
const auto_sender_service_1 = require("../services/auto-sender.service");
class BatchApplicationRequestDto {
}
class ApplicationFiltersDto {
}
let AutoSenderController = class AutoSenderController {
    constructor(autoSenderService) {
        this.autoSenderService = autoSenderService;
    }
    async queueBatchApplications(req, dto) {
        const batchDto = {
            resumeId: dto.resumeId,
            jobIds: dto.jobIds,
            coverLetter: dto.coverLetter,
        };
        return this.autoSenderService.queueApplications(req.user.userId, batchDto);
    }
    async getApplications(req, query) {
        const filters = {};
        if (query.status) {
            filters.status = query.status;
        }
        if (query.jobId) {
            filters.jobId = query.jobId;
        }
        if (query.batchId) {
            filters.batchId = query.batchId;
        }
        if (query.fromDate) {
            filters.fromDate = new Date(query.fromDate);
        }
        if (query.toDate) {
            filters.toDate = new Date(query.toDate);
        }
        const page = query.page ? parseInt(String(query.page), 10) : 1;
        const limit = query.limit ? parseInt(String(query.limit), 10) : 20;
        return this.autoSenderService.getApplications(req.user.userId, filters, page, limit);
    }
    async getApplicationStatus(req, applicationId) {
        return this.autoSenderService.getApplicationStatus(req.user.userId, applicationId);
    }
    async getApplicationsByBatch(req, batchId) {
        return this.autoSenderService.getApplicationsByBatchId(req.user.userId, batchId);
    }
    async cancelApplication(req, applicationId) {
        return this.autoSenderService.cancelApplication(req.user.userId, applicationId);
    }
};
exports.AutoSenderController = AutoSenderController;
__decorate([
    (0, common_1.Post)('batch'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, BatchApplicationRequestDto]),
    __metadata("design:returntype", Promise)
], AutoSenderController.prototype, "queueBatchApplications", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, ApplicationFiltersDto]),
    __metadata("design:returntype", Promise)
], AutoSenderController.prototype, "getApplications", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AutoSenderController.prototype, "getApplicationStatus", null);
__decorate([
    (0, common_1.Get)('batch/:batchId'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('batchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AutoSenderController.prototype, "getApplicationsByBatch", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AutoSenderController.prototype, "cancelApplication", null);
exports.AutoSenderController = AutoSenderController = __decorate([
    (0, common_1.Controller)('applications'),
    __metadata("design:paramtypes", [auto_sender_service_1.AutoSenderService])
], AutoSenderController);
//# sourceMappingURL=auto-sender.controller.js.map