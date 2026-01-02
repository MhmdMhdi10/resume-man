"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const shared_1 = require("../../../../../libs/shared/src");
const dashboard_service_1 = require("../services/dashboard.service");
const statusCountsArb = fc.record({
    [shared_1.ApplicationStatus.PENDING]: fc.nat({ max: 100 }),
    [shared_1.ApplicationStatus.PROCESSING]: fc.nat({ max: 100 }),
    [shared_1.ApplicationStatus.SUBMITTED]: fc.nat({ max: 100 }),
    [shared_1.ApplicationStatus.FAILED]: fc.nat({ max: 100 }),
    [shared_1.ApplicationStatus.CANCELLED]: fc.nat({ max: 100 }),
});
function toAggregationFormat(statusCounts) {
    return Object.entries(statusCounts)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({ _id: status, count }));
}
function calculateExpectedStats(statusCounts) {
    const totalApplications = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
    const submittedCount = statusCounts[shared_1.ApplicationStatus.SUBMITTED];
    const pendingCount = statusCounts[shared_1.ApplicationStatus.PENDING] + statusCounts[shared_1.ApplicationStatus.PROCESSING];
    const failedCount = statusCounts[shared_1.ApplicationStatus.FAILED];
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
describe('Application Statistics Calculation Property Tests', () => {
    let dashboardService;
    beforeEach(() => {
        dashboardService = new dashboard_service_1.DashboardService(null, null);
    });
    it('should calculate total as sum of all statuses', async () => {
        await fc.assert(fc.asyncProperty(statusCountsArb, async (statusCounts) => {
            const aggregationData = toAggregationFormat(statusCounts);
            const stats = dashboardService.calculateStats(aggregationData);
            const expectedTotal = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
            expect(stats.totalApplications).toBe(expectedTotal);
        }), { numRuns: 100 });
    });
    it('should correctly count submitted applications', async () => {
        await fc.assert(fc.asyncProperty(statusCountsArb, async (statusCounts) => {
            const aggregationData = toAggregationFormat(statusCounts);
            const stats = dashboardService.calculateStats(aggregationData);
            expect(stats.submittedCount).toBe(statusCounts[shared_1.ApplicationStatus.SUBMITTED]);
        }), { numRuns: 100 });
    });
    it('should count pending as PENDING + PROCESSING', async () => {
        await fc.assert(fc.asyncProperty(statusCountsArb, async (statusCounts) => {
            const aggregationData = toAggregationFormat(statusCounts);
            const stats = dashboardService.calculateStats(aggregationData);
            const expectedPending = statusCounts[shared_1.ApplicationStatus.PENDING] + statusCounts[shared_1.ApplicationStatus.PROCESSING];
            expect(stats.pendingCount).toBe(expectedPending);
        }), { numRuns: 100 });
    });
    it('should correctly count failed applications', async () => {
        await fc.assert(fc.asyncProperty(statusCountsArb, async (statusCounts) => {
            const aggregationData = toAggregationFormat(statusCounts);
            const stats = dashboardService.calculateStats(aggregationData);
            expect(stats.failedCount).toBe(statusCounts[shared_1.ApplicationStatus.FAILED]);
        }), { numRuns: 100 });
    });
    it('should calculate success rate correctly', async () => {
        await fc.assert(fc.asyncProperty(statusCountsArb, async (statusCounts) => {
            const aggregationData = toAggregationFormat(statusCounts);
            const stats = dashboardService.calculateStats(aggregationData);
            const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
            const submitted = statusCounts[shared_1.ApplicationStatus.SUBMITTED];
            const expectedRate = total > 0 ? Math.round((submitted / total) * 100 * 100) / 100 : 0;
            expect(stats.successRate).toBe(expectedRate);
        }), { numRuns: 100 });
    });
    it('should return 0 success rate for empty applications', async () => {
        const stats = dashboardService.calculateStats([]);
        expect(stats.successRate).toBe(0);
        expect(stats.totalApplications).toBe(0);
    });
    it('should have success rate between 0 and 100', async () => {
        await fc.assert(fc.asyncProperty(statusCountsArb, async (statusCounts) => {
            const aggregationData = toAggregationFormat(statusCounts);
            const stats = dashboardService.calculateStats(aggregationData);
            expect(stats.successRate).toBeGreaterThanOrEqual(0);
            expect(stats.successRate).toBeLessThanOrEqual(100);
        }), { numRuns: 100 });
    });
    it('should match expected stats calculation', async () => {
        await fc.assert(fc.asyncProperty(statusCountsArb, async (statusCounts) => {
            const aggregationData = toAggregationFormat(statusCounts);
            const stats = dashboardService.calculateStats(aggregationData);
            const expected = calculateExpectedStats(statusCounts);
            expect(stats.totalApplications).toBe(expected.totalApplications);
            expect(stats.submittedCount).toBe(expected.submittedCount);
            expect(stats.pendingCount).toBe(expected.pendingCount);
            expect(stats.failedCount).toBe(expected.failedCount);
            expect(stats.successRate).toBe(expected.successRate);
        }), { numRuns: 100 });
    });
});
//# sourceMappingURL=statistics-calculation.pbt.spec.js.map