import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationType, NotificationChannel } from '@app/shared';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema';
import {
  NotificationPreferences,
  NotificationPreferencesDocument,
  createDefaultPreferences,
} from '../schemas/notification-preferences.schema';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdatePreferencesDto {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  applicationUpdates?: boolean;
  batchSummaries?: boolean;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationPreferences.name)
    private readonly preferencesModel: Model<NotificationPreferencesDocument>,
  ) {}

  /**
   * Send a notification to a user, respecting their preferences
   */
  async sendNotification(
    userId: string,
    payload: NotificationPayload,
  ): Promise<Notification | null> {
    const userObjectId = new Types.ObjectId(userId);
    const preferences = await this.getOrCreatePreferences(userId);

    // Check if notification type is enabled
    if (!this.isNotificationTypeEnabled(payload.type, preferences)) {
      this.logger.debug(
        `Notification type ${payload.type} disabled for user ${userId}`,
      );
      return null;
    }

    // Filter channels based on preferences
    const enabledChannels = this.filterEnabledChannels(
      payload.channels,
      preferences,
    );

    if (enabledChannels.length === 0) {
      this.logger.debug(`No enabled channels for user ${userId}`);
      return null;
    }

    // Create in-app notification if enabled
    let notification: NotificationDocument | null = null;
    if (enabledChannels.includes(NotificationChannel.IN_APP)) {
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

    // Send email if enabled (placeholder for email service integration)
    if (enabledChannels.includes(NotificationChannel.EMAIL)) {
      await this.sendEmailNotification(userId, payload);
    }

    return notification;
  }

  /**
   * Get paginated notifications for a user
   */
  async getNotifications(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<Notification>> {
    const userObjectId = new Types.ObjectId(userId);
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

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      { read: true },
      { new: true },
    );

    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { read: true },
    );
    return result.modifiedCount;
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    return this.getOrCreatePreferences(userId);
  }

  /**
   * Update notification preferences for a user
   */
  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<NotificationPreferences> {
    const userObjectId = new Types.ObjectId(userId);

    const preferences = await this.preferencesModel.findOneAndUpdate(
      { userId: userObjectId },
      { $set: dto },
      { new: true, upsert: true },
    );

    if (!preferences) {
      // Create with defaults and apply updates
      const newPrefs = new this.preferencesModel({
        ...createDefaultPreferences(userObjectId),
        ...dto,
      });
      return newPrefs.save();
    }

    this.logger.debug(`Updated preferences for user ${userId}`);
    return preferences;
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const result = await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }
  }

  /**
   * Get or create default preferences for a user
   */
  private async getOrCreatePreferences(
    userId: string,
  ): Promise<NotificationPreferences> {
    const userObjectId = new Types.ObjectId(userId);

    let preferences = await this.preferencesModel.findOne({
      userId: userObjectId,
    });

    if (!preferences) {
      preferences = new this.preferencesModel(
        createDefaultPreferences(userObjectId),
      );
      await preferences.save();
      this.logger.debug(`Created default preferences for user ${userId}`);
    }

    return preferences;
  }

  /**
   * Check if a notification type is enabled based on preferences
   */
  isNotificationTypeEnabled(
    type: NotificationType,
    preferences: NotificationPreferences,
  ): boolean {
    switch (type) {
      case NotificationType.APPLICATION_SUBMITTED:
      case NotificationType.APPLICATION_FAILED:
        return preferences.applicationUpdates;
      case NotificationType.BATCH_COMPLETE:
        return preferences.batchSummaries;
      default:
        return true;
    }
  }

  /**
   * Filter channels based on user preferences
   */
  filterEnabledChannels(
    requestedChannels: NotificationChannel[],
    preferences: NotificationPreferences,
  ): NotificationChannel[] {
    return requestedChannels.filter((channel) => {
      switch (channel) {
        case NotificationChannel.EMAIL:
          return preferences.emailEnabled;
        case NotificationChannel.IN_APP:
          return preferences.inAppEnabled;
        default:
          return false;
      }
    });
  }

  /**
   * Send email notification (placeholder for email service integration)
   */
  private async sendEmailNotification(
    userId: string,
    payload: NotificationPayload,
  ): Promise<void> {
    // TODO: Integrate with email service
    this.logger.debug(
      `Would send email notification to user ${userId}: ${payload.title}`,
    );
  }
}
