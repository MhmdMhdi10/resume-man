import {
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  NotificationService,
  UpdatePreferencesDto,
} from '../services/notification.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

class PaginationQueryDto {
  page?: number;
  limit?: number;
}

class UpdatePreferencesRequestDto {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  applicationUpdates?: boolean;
  batchSummaries?: boolean;
}

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /notifications - Get paginated list of notifications
   */
  @Get()
  async getNotifications(
    @Request() req: AuthenticatedRequest,
    @Query() query: PaginationQueryDto,
  ) {
    const page = query.page ? parseInt(String(query.page), 10) : 1;
    const limit = query.limit ? parseInt(String(query.limit), 10) : 20;
    return this.notificationService.getNotifications(req.user.userId, page, limit);
  }

  /**
   * GET /notifications/unread-count - Get unread notification count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req: AuthenticatedRequest) {
    const count = await this.notificationService.getUnreadCount(req.user.userId);
    return { count };
  }

  /**
   * GET /notifications/preferences - Get notification preferences
   */
  @Get('preferences')
  async getPreferences(@Request() req: AuthenticatedRequest) {
    return this.notificationService.getPreferences(req.user.userId);
  }

  /**
   * PUT /notifications/preferences - Update notification preferences
   */
  @Put('preferences')
  async updatePreferences(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdatePreferencesRequestDto,
  ) {
    const updateDto: UpdatePreferencesDto = {};

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

  /**
   * PATCH /notifications/:id/read - Mark a notification as read
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Request() req: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    return this.notificationService.markAsRead(req.user.userId, notificationId);
  }

  /**
   * PATCH /notifications/read-all - Mark all notifications as read
   */
  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Request() req: AuthenticatedRequest) {
    const count = await this.notificationService.markAllAsRead(req.user.userId);
    return { markedAsRead: count };
  }

  /**
   * DELETE /notifications/:id - Delete a notification
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Request() req: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ) {
    await this.notificationService.deleteNotification(req.user.userId, notificationId);
  }
}
