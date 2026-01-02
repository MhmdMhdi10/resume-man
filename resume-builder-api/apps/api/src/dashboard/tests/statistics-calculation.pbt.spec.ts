/**
 * Feature: resume-builder-auto-sender
 * Property 5: Application Statistics Calculation
 * Validates: Requirements 7.3
 *
 * For any set of user applications, the calculated statistics (total, submitted,
 * pending, failed, success rate) should accurately reflect the actual application
 * statuses in the database.
 */

import * as fc from 'fast-check';
import { ApplicationStatus } from '@app/shared';
import { DashboardService, ApplicationStats } from '../services/dashboard.service';

// Arbitrary for generating status counts
const statusCountsArb = fc.record({
  [ApplicationStatus.PENDING]: fc.nat({ max: 100 }),
  [ApplicationStatus.PROCESSING]: fc.nat({ max: 100 }),
  [ApplicationStatus.SUBMITTED]: fc.nat({ max: 100 }),
  [ApplicationStatus.FAILED]: fc.nat({ max: 100 }),
  [ApplicationStatus.CANCELLED]: fc.nat({ max: 100 }),
});

// Convert status counts to aggregation format
function toAggregationFormat(
  statusCounts: Record<ApplicationStatus, number>,
): Array<{ _id: string; count: number }> {
  return Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ _id: status, count }));
}

// Calculate expected stats from status counts
function calculateExpectedStats(
  statusCounts: Record<ApplicationStatus, number>,
): ApplicationStats {
  const totalApplications = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  const submittedCount = statusCounts[ApplicationStatus.SUBMITTED];
  const pendingCount =
    statusCounts[ApplicationStatus.PENDING] + statusCounts[ApplicationStatus.PROCESSING];
  const failedCount = statusCounts[ApplicationStatus.FAILED];
  const successRate =
    totalApplications > 0
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

describe('Application Statistics Calculation Property Tests', () => {
  let dashboardService: DashboardService;

  beforeEach(() => {
    // Create service instance with null dependencies since we're testing calculateStats directly
    dashboardService = new DashboardService(null as any, null as any);
  });

  /**
   * Property: Total applications equals sum of all status counts
   */
  it('should calculate total as sum of all statuses', async () => {
    await fc.assert(
      fc.asyncProperty(statusCountsArb, async (statusCounts) => {
        const aggregationData = toAggregationFormat(statusCounts);
        const stats = dashboardService.calculateStats(aggregationData);
        const expectedTotal = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

        expect(stats.totalApplications).toBe(expectedTotal);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Submitted count matches SUBMITTED status count
   */
  it('should correctly count submitted applications', async () => {
    await fc.assert(
      fc.asyncProperty(statusCountsArb, async (statusCounts) => {
        const aggregationData = toAggregationFormat(statusCounts);
        const stats = dashboardService.calculateStats(aggregationData);

        expect(stats.submittedCount).toBe(statusCounts[ApplicationStatus.SUBMITTED]);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Pending count includes PENDING and PROCESSING statuses
   */
  it('should count pending as PENDING + PROCESSING', async () => {
    await fc.assert(
      fc.asyncProperty(statusCountsArb, async (statusCounts) => {
        const aggregationData = toAggregationFormat(statusCounts);
        const stats = dashboardService.calculateStats(aggregationData);
        const expectedPending =
          statusCounts[ApplicationStatus.PENDING] + statusCounts[ApplicationStatus.PROCESSING];

        expect(stats.pendingCount).toBe(expectedPending);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Failed count matches FAILED status count
   */
  it('should correctly count failed applications', async () => {
    await fc.assert(
      fc.asyncProperty(statusCountsArb, async (statusCounts) => {
        const aggregationData = toAggregationFormat(statusCounts);
        const stats = dashboardService.calculateStats(aggregationData);

        expect(stats.failedCount).toBe(statusCounts[ApplicationStatus.FAILED]);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Success rate is (submitted / total) * 100, rounded to 2 decimals
   */
  it('should calculate success rate correctly', async () => {
    await fc.assert(
      fc.asyncProperty(statusCountsArb, async (statusCounts) => {
        const aggregationData = toAggregationFormat(statusCounts);
        const stats = dashboardService.calculateStats(aggregationData);
        const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
        const submitted = statusCounts[ApplicationStatus.SUBMITTED];
        const expectedRate =
          total > 0 ? Math.round((submitted / total) * 100 * 100) / 100 : 0;

        expect(stats.successRate).toBe(expectedRate);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Success rate is 0 when total is 0
   */
  it('should return 0 success rate for empty applications', async () => {
    const stats = dashboardService.calculateStats([]);
    expect(stats.successRate).toBe(0);
    expect(stats.totalApplications).toBe(0);
  });

  /**
   * Property: Success rate is between 0 and 100
   */
  it('should have success rate between 0 and 100', async () => {
    await fc.assert(
      fc.asyncProperty(statusCountsArb, async (statusCounts) => {
        const aggregationData = toAggregationFormat(statusCounts);
        const stats = dashboardService.calculateStats(aggregationData);

        expect(stats.successRate).toBeGreaterThanOrEqual(0);
        expect(stats.successRate).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Stats match expected calculation
   */
  it('should match expected stats calculation', async () => {
    await fc.assert(
      fc.asyncProperty(statusCountsArb, async (statusCounts) => {
        const aggregationData = toAggregationFormat(statusCounts);
        const stats = dashboardService.calculateStats(aggregationData);
        const expected = calculateExpectedStats(statusCounts);

        expect(stats.totalApplications).toBe(expected.totalApplications);
        expect(stats.submittedCount).toBe(expected.submittedCount);
        expect(stats.pendingCount).toBe(expected.pendingCount);
        expect(stats.failedCount).toBe(expected.failedCount);
        expect(stats.successRate).toBe(expected.successRate);
      }),
      { numRuns: 100 },
    );
  });
});
