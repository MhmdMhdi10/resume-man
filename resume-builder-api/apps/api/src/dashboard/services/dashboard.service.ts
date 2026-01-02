import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApplicationStatus } from '@app/shared';
import { Application, ApplicationDocument } from '../../auto-sender/schemas/application.schema';
import { RedisService } from '../../database/redis.service';

export interface ApplicationStats {
  totalApplications: number;
  submittedCount: number;
  pendingCount: number;
  failedCount: number;
  successRate: number;
}

export interface TimelineData {
  date: Date;
  submitted: number;
  failed: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get application statistics for a user
   */
  async getApplicationStats(userId: string): Promise<ApplicationStats> {
    const cacheKey = `dashboard:stats:${userId}`;

    // Try cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for stats: ${userId}`);
      return JSON.parse(cached);
    }

    const userObjectId = new Types.ObjectId(userId);

    const [statusCounts] = await this.applicationModel.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = this.calculateStats(statusCounts ? [statusCounts] : []);

    // If no results from aggregate, query again with proper grouping
    if (!statusCounts) {
      const allStatusCounts = await this.applicationModel.aggregate([
        { $match: { userId: userObjectId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);
      const calculatedStats = this.calculateStats(allStatusCounts);
      await this.redisService.set(cacheKey, JSON.stringify(calculatedStats), this.CACHE_TTL);
      return calculatedStats;
    }

    // Re-run aggregate to get all status counts
    const allStatusCounts = await this.applicationModel.aggregate([
      { $match: { userId: userObjectId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const calculatedStats = this.calculateStats(allStatusCounts);
    await this.redisService.set(cacheKey, JSON.stringify(calculatedStats), this.CACHE_TTL);

    this.logger.debug(`Calculated stats for user ${userId}: ${JSON.stringify(calculatedStats)}`);
    return calculatedStats;
  }

  /**
   * Calculate stats from aggregation results
   */
  calculateStats(statusCounts: Array<{ _id: string; count: number }>): ApplicationStats {
    let totalApplications = 0;
    let submittedCount = 0;
    let pendingCount = 0;
    let failedCount = 0;

    for (const item of statusCounts) {
      totalApplications += item.count;
      switch (item._id) {
        case ApplicationStatus.SUBMITTED:
          submittedCount = item.count;
          break;
        case ApplicationStatus.PENDING:
        case ApplicationStatus.PROCESSING:
          pendingCount += item.count;
          break;
        case ApplicationStatus.FAILED:
          failedCount = item.count;
          break;
      }
    }

    const successRate = totalApplications > 0 
      ? Math.round((submittedCount / totalApplications) * 100 * 100) / 100
      : 0;

    return {
      totalApplications,
      submittedCount,
      pendingCount,
      failedCount,
      successRate,
    };
  }

  /**
   * Get application timeline data for a user
   */
  async getApplicationTimeline(userId: string, days: number = 30): Promise<TimelineData[]> {
    const cacheKey = `dashboard:timeline:${userId}:${days}`;

    // Try cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for timeline: ${userId}`);
      return JSON.parse(cached);
    }

    const userObjectId = new Types.ObjectId(userId);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const timelineData = await this.applicationModel.aggregate([
      {
        $match: {
          userId: userObjectId,
          createdAt: { $gte: startDate },
          status: { $in: [ApplicationStatus.SUBMITTED, ApplicationStatus.FAILED] },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.date',
          statuses: {
            $push: {
              status: '$_id.status',
              count: '$count',
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result: TimelineData[] = timelineData.map((item) => {
      let submitted = 0;
      let failed = 0;

      for (const status of item.statuses) {
        if (status.status === ApplicationStatus.SUBMITTED) {
          submitted = status.count;
        } else if (status.status === ApplicationStatus.FAILED) {
          failed = status.count;
        }
      }

      return {
        date: new Date(item._id),
        submitted,
        failed,
      };
    });

    await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    this.logger.debug(`Calculated timeline for user ${userId}: ${result.length} days`);
    return result;
  }

  /**
   * Invalidate cache for a user (call when applications change)
   */
  async invalidateCache(userId: string): Promise<void> {
    await this.redisService.del(`dashboard:stats:${userId}`);
    // Invalidate all timeline caches for this user
    for (const days of [7, 14, 30, 60, 90]) {
      await this.redisService.del(`dashboard:timeline:${userId}:${days}`);
    }
    this.logger.debug(`Invalidated cache for user ${userId}`);
  }
}
