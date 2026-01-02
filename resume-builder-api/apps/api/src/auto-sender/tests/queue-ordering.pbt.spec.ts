/**
 * Feature: resume-builder-auto-sender
 * Property 4: Application Queue Sequential Processing
 * Validates: Requirements 6.6
 *
 * For any batch of queued applications, the Application_Queue should process them
 * in FIFO order, with no concurrent processing of applications from the same user.
 */

import * as fc from 'fast-check';
import { ApplicationQueueService, QueuedApplicationItem } from '../services/application-queue.service';
import { RedisService } from '../../database/redis.service';

// Mock Redis client for testing
class MockRedisClient {
  private data: Map<string, string> = new Map();
  private lists: Map<string, string[]> = new Map();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<string | null> {
    // Handle NX flag (only set if not exists)
    if (args.includes('NX') && this.data.has(key)) {
      return null;
    }
    this.data.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.data.has(key);
    this.data.delete(key);
    return existed ? 1 : 0;
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    const list = this.lists.get(key) ?? [];
    list.push(...values);
    this.lists.set(key, list);
    return list.length;
  }

  async lpop(key: string): Promise<string | null> {
    const list = this.lists.get(key) ?? [];
    return list.shift() ?? null;
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const list = this.lists.get(key) ?? [];
    const end = stop === -1 ? list.length : stop + 1;
    return list.slice(start, end);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    const list = this.lists.get(key) ?? [];
    const index = list.indexOf(value);
    if (index !== -1) {
      list.splice(index, 1);
      this.lists.set(key, list);
      return 1;
    }
    return 0;
  }

  async llen(key: string): Promise<number> {
    return (this.lists.get(key) ?? []).length;
  }

  clear(): void {
    this.data.clear();
    this.lists.clear();
  }
}

// Mock RedisService
class MockRedisService {
  private client = new MockRedisClient();

  getClient(): MockRedisClient {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  clear(): void {
    this.client.clear();
  }
}

// Arbitrary for generating queue items
const queueItemArb = fc.record({
  applicationId: fc.uuid(),
  userId: fc.uuid(),
  jobId: fc.uuid(),
  resumeId: fc.uuid(),
  queuedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
});

// Arbitrary for generating multiple items from same user
const userItemsArb = fc
  .tuple(fc.uuid(), fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }))
  .map(([userId, applicationIds]) =>
    applicationIds.map((applicationId, index) => ({
      applicationId,
      userId,
      jobId: `job-${index}`,
      resumeId: `resume-${index}`,
      queuedAt: new Date(Date.now() + index * 1000),
    })),
  );

describe('Application Queue Sequential Processing Property Tests', () => {
  let queueService: ApplicationQueueService;
  let mockRedisService: MockRedisService;

  // Helper to reset state before each property test iteration
  const resetState = () => {
    mockRedisService = new MockRedisService();
    queueService = new ApplicationQueueService(mockRedisService as unknown as RedisService);
  };

  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    mockRedisService.clear();
  });

  /**
   * Property: Items are dequeued in FIFO order
   */
  it('should dequeue items in FIFO order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queueItemArb, { minLength: 1, maxLength: 20 }).map((items) =>
          // Ensure unique userIds to avoid user-level locking affecting order
          items.map((item, index) => ({
            ...item,
            userId: `user-${index}`,
            applicationId: `app-${index}`,
          })),
        ),
        async (items) => {
          // Reset state for each iteration to ensure isolation
          resetState();

          // Enqueue all items
          for (const item of items) {
            await queueService.enqueue(item);
          }

          // Dequeue and verify FIFO order
          const dequeued: QueuedApplicationItem[] = [];
          let item: QueuedApplicationItem | null;

          while ((item = await queueService.dequeue()) !== null) {
            dequeued.push(item);
            // Release lock to allow next dequeue
            await queueService.releaseLock(item.applicationId, item.userId);
          }

          // Verify order matches enqueue order
          expect(dequeued.length).toBe(items.length);
          for (let i = 0; i < dequeued.length; i++) {
            expect(dequeued[i].applicationId).toBe(items[i].applicationId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: No concurrent processing of applications from the same user
   */
  it('should not allow concurrent processing from same user', async () => {
    await fc.assert(
      fc.asyncProperty(userItemsArb, async (userItems) => {
        // Reset state for each iteration to ensure isolation
        resetState();

        // Enqueue all items from the same user
        for (const item of userItems) {
          await queueService.enqueue(item);
        }

        // First dequeue should succeed
        const first = await queueService.dequeue();
        expect(first).not.toBeNull();
        expect(first!.applicationId).toBe(userItems[0].applicationId);

        // Second dequeue should return null (same user is processing)
        const second = await queueService.dequeue();
        expect(second).toBeNull();

        // After releasing lock, next item should be available
        await queueService.releaseLock(first!.applicationId, first!.userId);
        const third = await queueService.dequeue();
        expect(third).not.toBeNull();
        expect(third!.applicationId).toBe(userItems[1].applicationId);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Queue length decreases by 1 after successful dequeue
   */
  it('should decrease queue length by 1 after dequeue', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queueItemArb, { minLength: 1, maxLength: 10 }).map((items) =>
          items.map((item, index) => ({
            ...item,
            userId: `user-${index}`,
            applicationId: `app-${index}`,
          })),
        ),
        async (items) => {
          // Reset state for each iteration to ensure isolation
          resetState();

          for (const item of items) {
            await queueService.enqueue(item);
          }

          const initialLength = await queueService.getQueueLength();
          expect(initialLength).toBe(items.length);

          const dequeued = await queueService.dequeue();
          if (dequeued) {
            const newLength = await queueService.getQueueLength();
            expect(newLength).toBe(initialLength - 1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Batch enqueue maintains order
   */
  it('should maintain order when batch enqueueing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queueItemArb, { minLength: 2, maxLength: 15 }).map((items) =>
          items.map((item, index) => ({
            ...item,
            userId: `user-${index}`,
            applicationId: `app-${index}`,
          })),
        ),
        async (items) => {
          // Reset state for each iteration to ensure isolation
          resetState();

          await queueService.enqueueBatch(items);

          const queueItems = await queueService.getQueueItems();
          expect(queueItems.length).toBe(items.length);

          for (let i = 0; i < queueItems.length; i++) {
            expect(queueItems[i].applicationId).toBe(items[i].applicationId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Removed items are no longer in queue
   */
  it('should remove items from queue correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(queueItemArb, { minLength: 2, maxLength: 10 }).map((items) =>
          items.map((item, index) => ({
            ...item,
            userId: `user-${index}`,
            applicationId: `app-${index}`,
          })),
        ),
        fc.nat(),
        async (items, indexSeed) => {
          // Reset state for each iteration to ensure isolation
          resetState();

          await queueService.enqueueBatch(items);

          const removeIndex = indexSeed % items.length;
          const toRemove = items[removeIndex];

          const removed = await queueService.removeFromQueue(toRemove.applicationId);
          expect(removed).toBe(true);

          const remaining = await queueService.getQueueItems();
          expect(remaining.length).toBe(items.length - 1);

          const remainingIds = remaining.map((r) => r.applicationId);
          expect(remainingIds).not.toContain(toRemove.applicationId);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Empty queue returns null on dequeue
   */
  it('should return null when dequeuing from empty queue', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        // Reset state for each iteration to ensure isolation
        resetState();

        const result = await queueService.dequeue();
        expect(result).toBeNull();
      }),
      { numRuns: 10 },
    );
  });

  /**
   * Property: Requeue adds item back to queue
   */
  it('should add item back to queue on requeue', async () => {
    await fc.assert(
      fc.asyncProperty(
        queueItemArb.map((item) => ({
          ...item,
          userId: 'test-user',
          applicationId: 'test-app',
        })),
        async (item) => {
          // Reset state for each iteration to ensure isolation
          resetState();

          await queueService.enqueue(item);

          const dequeued = await queueService.dequeue();
          expect(dequeued).not.toBeNull();

          const lengthAfterDequeue = await queueService.getQueueLength();
          expect(lengthAfterDequeue).toBe(0);

          await queueService.requeue(dequeued!);

          const lengthAfterRequeue = await queueService.getQueueLength();
          expect(lengthAfterRequeue).toBe(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Processing lock prevents duplicate processing
   */
  it('should prevent duplicate processing with locks', async () => {
    await fc.assert(
      fc.asyncProperty(queueItemArb, async (item) => {
        // Reset state for each iteration to ensure isolation
        resetState();

        await queueService.enqueue({
          ...item,
          userId: 'unique-user',
          applicationId: 'unique-app',
        });

        const first = await queueService.dequeue();
        expect(first).not.toBeNull();

        // Check that the application is marked as processing
        const isProcessing = await queueService.isProcessing(first!.applicationId);
        expect(isProcessing).toBe(true);

        // After release, should no longer be processing
        await queueService.releaseLock(first!.applicationId, first!.userId);
        const isStillProcessing = await queueService.isProcessing(first!.applicationId);
        expect(isStillProcessing).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
