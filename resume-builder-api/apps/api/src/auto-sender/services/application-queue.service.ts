import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../database/redis.service';

export interface QueuedApplicationItem {
  applicationId: string;
  userId: string;
  jobId: string;
  resumeId: string;
  queuedAt: Date;
}

@Injectable()
export class ApplicationQueueService {
  private readonly logger = new Logger(ApplicationQueueService.name);
  private readonly QUEUE_KEY = 'queue:applications';
  private readonly PROCESSING_LOCK_PREFIX = 'queue:processing:';
  private readonly USER_PROCESSING_PREFIX = 'queue:user_processing:';
  private readonly LOCK_TTL_SECONDS = 300; // 5 minutes

  constructor(private readonly redisService: RedisService) {}

  /**
   * Enqueue an application for processing (FIFO - adds to end of queue)
   */
  async enqueue(item: QueuedApplicationItem): Promise<void> {
    const serialized = JSON.stringify({
      ...item,
      queuedAt: item.queuedAt.toISOString(),
    });
    // rpush adds to the end, lpop removes from the front = FIFO
    await this.redisService.getClient().rpush(this.QUEUE_KEY, serialized);
    this.logger.debug(`Enqueued application ${item.applicationId} for user ${item.userId}`);
  }

  /**
   * Enqueue multiple applications in batch
   */
  async enqueueBatch(items: QueuedApplicationItem[]): Promise<void> {
    if (items.length === 0) return;

    const serialized = items.map((item) =>
      JSON.stringify({
        ...item,
        queuedAt: item.queuedAt.toISOString(),
      }),
    );
    await this.redisService.getClient().rpush(this.QUEUE_KEY, ...serialized);
    this.logger.debug(`Enqueued ${items.length} applications`);
  }

  /**
   * Dequeue an application for processing with distributed locking
   * Returns null if queue is empty or no application can be processed
   */
  async dequeue(): Promise<QueuedApplicationItem | null> {
    const client = this.redisService.getClient();

    // Get items from the front of the queue without removing
    const items = await client.lrange(this.QUEUE_KEY, 0, 9);

    for (const serialized of items) {
      const item = this.deserializeItem(serialized);
      if (!item) continue;

      // Check if user already has an application being processed
      const userLockKey = `${this.USER_PROCESSING_PREFIX}${item.userId}`;
      const userHasProcessing = await client.get(userLockKey);

      if (userHasProcessing) {
        // Skip this item, user already has one processing
        continue;
      }

      // Try to acquire lock for this application
      const lockKey = `${this.PROCESSING_LOCK_PREFIX}${item.applicationId}`;
      const lockAcquired = await client.set(
        lockKey,
        '1',
        'EX',
        this.LOCK_TTL_SECONDS,
        'NX',
      );

      if (!lockAcquired) {
        // Another worker is processing this
        continue;
      }

      // Set user processing lock
      await client.set(userLockKey, item.applicationId, 'EX', this.LOCK_TTL_SECONDS);

      // Remove the item from queue
      await client.lrem(this.QUEUE_KEY, 1, serialized);

      this.logger.debug(`Dequeued application ${item.applicationId} for processing`);
      return item;
    }

    return null;
  }

  /**
   * Release the processing lock for an application
   */
  async releaseLock(applicationId: string, userId: string): Promise<void> {
    const client = this.redisService.getClient();
    const lockKey = `${this.PROCESSING_LOCK_PREFIX}${applicationId}`;
    const userLockKey = `${this.USER_PROCESSING_PREFIX}${userId}`;

    await client.del(lockKey);
    await client.del(userLockKey);
    this.logger.debug(`Released lock for application ${applicationId}`);
  }

  /**
   * Re-queue an application (e.g., for retry)
   */
  async requeue(item: QueuedApplicationItem): Promise<void> {
    await this.releaseLock(item.applicationId, item.userId);
    await this.enqueue({
      ...item,
      queuedAt: new Date(),
    });
    this.logger.debug(`Re-queued application ${item.applicationId}`);
  }

  /**
   * Get the current queue length
   */
  async getQueueLength(): Promise<number> {
    return this.redisService.llen(this.QUEUE_KEY);
  }

  /**
   * Get all items in the queue (for inspection)
   */
  async getQueueItems(start = 0, stop = -1): Promise<QueuedApplicationItem[]> {
    const items = await this.redisService.lrange(this.QUEUE_KEY, start, stop);
    return items
      .map((item) => this.deserializeItem(item))
      .filter((item): item is QueuedApplicationItem => item !== null);
  }

  /**
   * Remove a specific application from the queue
   */
  async removeFromQueue(applicationId: string): Promise<boolean> {
    const items = await this.redisService.lrange(this.QUEUE_KEY, 0, -1);

    for (const serialized of items) {
      const item = this.deserializeItem(serialized);
      if (item && item.applicationId === applicationId) {
        const removed = await this.redisService.getClient().lrem(this.QUEUE_KEY, 1, serialized);
        if (removed > 0) {
          this.logger.debug(`Removed application ${applicationId} from queue`);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if an application is currently being processed
   */
  async isProcessing(applicationId: string): Promise<boolean> {
    const lockKey = `${this.PROCESSING_LOCK_PREFIX}${applicationId}`;
    const lock = await this.redisService.get(lockKey);
    return lock !== null;
  }

  /**
   * Check if a user has an application being processed
   */
  async isUserProcessing(userId: string): Promise<boolean> {
    const userLockKey = `${this.USER_PROCESSING_PREFIX}${userId}`;
    const lock = await this.redisService.get(userLockKey);
    return lock !== null;
  }

  private deserializeItem(serialized: string): QueuedApplicationItem | null {
    try {
      const parsed = JSON.parse(serialized);
      return {
        ...parsed,
        queuedAt: new Date(parsed.queuedAt),
      };
    } catch (error) {
      this.logger.error(`Failed to deserialize queue item: ${error}`);
      return null;
    }
  }
}
