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
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const shared_1 = require("../../../../../libs/shared/src");
const notification_schema_1 = require("../schemas/notification.schema");
const notification_preferences_schema_1 = require("../schemas/notification-preferences.schema");
let NotificationService = NotificationService_1 = class NotificationService {
    constructor(notificationModel, preferencesModel) {
        this.notificationModel = notificationModel;
        this.preferencesModel = preferencesModel;
        this.logger = new common_1.Logger(NotificationService_1.name);
    }
    async sendNotification(userId, payload) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const preferences = await this.getOrCreatePreferences(userId);
        if (!this.isNotificationTypeEnabled(payload.type, preferences)) {
            this.logger.debug(`Notification type ${payload.type} disabled for user ${userId}`);
            return null;
        }
        const enabledChannels = this.filterEnabledChannels(payload.channels, preferences);
        if (enabledChannels.length === 0) {
            this.logger.debug(`No enabled channels for user ${userId}`);
            return null;
        }
        let notification = null;
        if (enabledChannels.includes(shared_1.NotificationChannel.IN_APP)) {
            notification = new this.notificationModel({
                userId: userObjectId,
                type: payload.type,
                title: payload.title,
                message: payload.message,
                data: payload.data,
                channels: enabledChannels,
                read: false,
            });
            await notification.save();
            this.logger.debug(`Created in-app notification for user ${userId}`);
        }
        if (enabledChannels.includes(shared_1.NotificationChannel.EMAIL)) {
            await this.sendEmailNotification(userId, payload);
        }
        return notification;
    }
    async getNotifications(userId, page = 1, limit = 20) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.notificationModel
                .find({ userId: userObjectId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .exec(),
            this.notificationModel.countDocuments({ userId: userObjectId }),
        ]);
        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async markAsRead(userId, notificationId) {
        const notification = await this.notificationModel.findOneAndUpdate({
            _id: new mongoose_2.Types.ObjectId(notificationId),
            userId: new mongoose_2.Types.ObjectId(userId),
        }, { read: true }, { new: true });
        if (!notification) {
            throw new common_1.NotFoundException(`Notification ${notificationId} not found`);
        }
        return notification;
    }
    async markAllAsRead(userId) {
        const result = await this.notificationModel.updateMany({ userId: new mongoose_2.Types.ObjectId(userId), read: false }, { read: true });
        return result.modifiedCount;
    }
    async getPreferences(userId) {
        return this.getOrCreatePreferences(userId);
    }
    async updatePreferences(userId, dto) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        const preferences = await this.preferencesModel.findOneAndUpdate({ userId: userObjectId }, { $set: dto }, { new: true, upsert: true });
        if (!preferences) {
            const newPrefs = new this.preferencesModel({
                ...(0, notification_preferences_schema_1.createDefaultPreferences)(userObjectId),
                ...dto,
            });
            return newPrefs.save();
        }
        this.logger.debug(`Updated preferences for user ${userId}`);
        return preferences;
    }
    async getUnreadCount(userId) {
        return this.notificationModel.countDocuments({
            userId: new mongoose_2.Types.ObjectId(userId),
            read: false,
        });
    }
    async deleteNotification(userId, notificationId) {
        const result = await this.notificationModel.deleteOne({
            _id: new mongoose_2.Types.ObjectId(notificationId),
            userId: new mongoose_2.Types.ObjectId(userId),
        });
        if (result.deletedCount === 0) {
            throw new common_1.NotFoundException(`Notification ${notificationId} not found`);
        }
    }
    async getOrCreatePreferences(userId) {
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        let preferences = await this.preferencesModel.findOne({
            userId: userObjectId,
        });
        if (!preferences) {
            preferences = new this.preferencesModel((0, notification_preferences_schema_1.createDefaultPreferences)(userObjectId));
            await preferences.save();
            this.logger.debug(`Created default preferences for user ${userId}`);
        }
        return preferences;
    }
    isNotificationTypeEnabled(type, preferences) {
        switch (type) {
            case shared_1.NotificationType.APPLICATION_SUBMITTED:
            case shared_1.NotificationType.APPLICATION_FAILED:
                return preferences.applicationUpdates;
            case shared_1.NotificationType.BATCH_COMPLETE:
                return preferences.batchSummaries;
            default:
                return true;
        }
    }
    filterEnabledChannels(requestedChannels, preferences) {
        return requestedChannels.filter((channel) => {
            switch (channel) {
                case shared_1.NotificationChannel.EMAIL:
                    return preferences.emailEnabled;
                case shared_1.NotificationChannel.IN_APP:
                    return preferences.inAppEnabled;
                default:
                    return false;
            }
        });
    }
    async sendEmailNotification(userId, payload) {
        this.logger.debug(`Would send email notification to user ${userId}: ${payload.title}`);
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __param(1, (0, mongoose_1.InjectModel)(notification_preferences_schema_1.NotificationPreferences.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], NotificationService);
//# sourceMappingURL=notification.service.js.map