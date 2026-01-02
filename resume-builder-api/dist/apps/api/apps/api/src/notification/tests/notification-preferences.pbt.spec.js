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
const notification_service_1 = require("../services/notification.service");
const mongoose_1 = require("mongoose");
const preferencesArb = fc.record({
    emailEnabled: fc.boolean(),
    inAppEnabled: fc.boolean(),
    applicationUpdates: fc.boolean(),
    batchSummaries: fc.boolean(),
});
const notificationTypeArb = fc.constantFrom(shared_1.NotificationType.APPLICATION_SUBMITTED, shared_1.NotificationType.APPLICATION_FAILED, shared_1.NotificationType.BATCH_COMPLETE);
const channelsArb = fc.subarray([shared_1.NotificationChannel.EMAIL, shared_1.NotificationChannel.IN_APP], { minLength: 1 });
function createMockPreferences(prefs) {
    return {
        userId: new mongoose_1.Types.ObjectId(),
        ...prefs,
    };
}
describe('Notification Preference Respect Property Tests', () => {
    let notificationService;
    beforeEach(() => {
        notificationService = new notification_service_1.NotificationService(null, null);
    });
    it('should respect emailEnabled preference', async () => {
        await fc.assert(fc.asyncProperty(preferencesArb, channelsArb, async (prefs, channels) => {
            const preferences = createMockPreferences(prefs);
            const filtered = notificationService.filterEnabledChannels(channels, preferences);
            if (prefs.emailEnabled) {
                if (channels.includes(shared_1.NotificationChannel.EMAIL)) {
                    expect(filtered.includes(shared_1.NotificationChannel.EMAIL)).toBe(true);
                }
            }
            else {
                expect(filtered.includes(shared_1.NotificationChannel.EMAIL)).toBe(false);
            }
        }), { numRuns: 100 });
    });
    it('should respect inAppEnabled preference', async () => {
        await fc.assert(fc.asyncProperty(preferencesArb, channelsArb, async (prefs, channels) => {
            const preferences = createMockPreferences(prefs);
            const filtered = notificationService.filterEnabledChannels(channels, preferences);
            if (prefs.inAppEnabled) {
                if (channels.includes(shared_1.NotificationChannel.IN_APP)) {
                    expect(filtered.includes(shared_1.NotificationChannel.IN_APP)).toBe(true);
                }
            }
            else {
                expect(filtered.includes(shared_1.NotificationChannel.IN_APP)).toBe(false);
            }
        }), { numRuns: 100 });
    });
    it('should respect applicationUpdates for APPLICATION_SUBMITTED', async () => {
        await fc.assert(fc.asyncProperty(preferencesArb, async (prefs) => {
            const preferences = createMockPreferences(prefs);
            const isEnabled = notificationService.isNotificationTypeEnabled(shared_1.NotificationType.APPLICATION_SUBMITTED, preferences);
            expect(isEnabled).toBe(prefs.applicationUpdates);
        }), { numRuns: 100 });
    });
    it('should respect applicationUpdates for APPLICATION_FAILED', async () => {
        await fc.assert(fc.asyncProperty(preferencesArb, async (prefs) => {
            const preferences = createMockPreferences(prefs);
            const isEnabled = notificationService.isNotificationTypeEnabled(shared_1.NotificationType.APPLICATION_FAILED, preferences);
            expect(isEnabled).toBe(prefs.applicationUpdates);
        }), { numRuns: 100 });
    });
    it('should respect batchSummaries for BATCH_COMPLETE', async () => {
        await fc.assert(fc.asyncProperty(preferencesArb, async (prefs) => {
            const preferences = createMockPreferences(prefs);
            const isEnabled = notificationService.isNotificationTypeEnabled(shared_1.NotificationType.BATCH_COMPLETE, preferences);
            expect(isEnabled).toBe(prefs.batchSummaries);
        }), { numRuns: 100 });
    });
    it('should only return subset of requested channels', async () => {
        await fc.assert(fc.asyncProperty(preferencesArb, channelsArb, async (prefs, channels) => {
            const preferences = createMockPreferences(prefs);
            const filtered = notificationService.filterEnabledChannels(channels, preferences);
            for (const channel of filtered) {
                expect(channels.includes(channel)).toBe(true);
            }
        }), { numRuns: 100 });
    });
    it('should return empty when all channels disabled', async () => {
        await fc.assert(fc.asyncProperty(channelsArb, async (channels) => {
            const preferences = createMockPreferences({
                emailEnabled: false,
                inAppEnabled: false,
                applicationUpdates: true,
                batchSummaries: true,
            });
            const filtered = notificationService.filterEnabledChannels(channels, preferences);
            expect(filtered.length).toBe(0);
        }), { numRuns: 100 });
    });
    it('should return all requested when all channels enabled', async () => {
        await fc.assert(fc.asyncProperty(channelsArb, async (channels) => {
            const preferences = createMockPreferences({
                emailEnabled: true,
                inAppEnabled: true,
                applicationUpdates: true,
                batchSummaries: true,
            });
            const filtered = notificationService.filterEnabledChannels(channels, preferences);
            expect(filtered.length).toBe(channels.length);
            for (const channel of channels) {
                expect(filtered.includes(channel)).toBe(true);
            }
        }), { numRuns: 100 });
    });
});
//# sourceMappingURL=notification-preferences.pbt.spec.js.map