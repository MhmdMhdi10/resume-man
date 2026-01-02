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
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("../services/notification.service");
class PaginationQueryDto {
}
class UpdatePreferencesRequestDto {
}
let NotificationController = class NotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async getNotifications(req, query) {
        const page = query.page ? parseInt(String(query.page), 10) : 1;
        const limit = query.limit ? parseInt(String(query.limit), 10) : 20;
        return this.notificationService.getNotifications(req.user.userId, page, limit);
    }
    async getUnreadCount(req) {
        const count = await this.notificationService.getUnreadCount(req.user.userId);
        return { count };
    }
    async getPreferences(req) {
        return this.notificationService.getPreferences(req.user.userId);
    }
    async updatePreferences(req, dto) {
        const updateDto = {};
        if (dto.emailEnabled !== undefined) {
            updateDto.emailEnabled = dto.emailEnabled;
        }
        if (dto.inAppEnabled !== undefined) {
            updateDto.inAppEnabled = dto.inAppEnabled;
        }
        if (dto.applicationUpdates !== undefined) {
            updateDto.applicationUpdates = dto.applicationUpdates;
        }
        if (dto.batchSummaries !== undefined) {
            updateDto.batchSummaries = dto.batchSummaries;
        }
        return this.notificationService.updatePreferences(req.user.userId, updateDto);
    }
    async markAsRead(req, notificationId) {
        return this.notificationService.markAsRead(req.user.userId, notificationId);
    }
    async markAllAsRead(req) {
        const count = await this.notificationService.markAllAsRead(req.user.userId);
        return { markedAsRead: count };
    }
    async deleteNotification(req, notificationId) {
        await this.notificationService.deleteNotification(req.user.userId, notificationId);
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, PaginationQueryDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getNotifications", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Get)('preferences'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Put)('preferences'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdatePreferencesRequestDto]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.Patch)(':id/read'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Patch)('read-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "deleteNotification", null);
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)('notifications'),
    __metadata("design:paramtypes", [notification_service_1.NotificationService])
], NotificationController);
//# sourceMappingURL=notification.controller.js.map