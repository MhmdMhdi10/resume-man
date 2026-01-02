/**
 * Feature: resume-builder-auto-sender
 * Property 10: Notification Preference Respect
 * Validates: Requirements 8.4
 *
 * For any user with configured notification preferences, the Notification_Service
 * should only send notifications through enabled channels and for enabled notification types.
 */

import * as fc from 'fast-check';
import { NotificationType, NotificationChannel } from '@app/shared';
import { NotificationService } from '../services/notification.service';
import { NotificationPreferences } from '../schemas/notification-preferences.schema';
import { Types } from 'mongoose';

// Arbitrary for generating notification preferences
const preferencesArb = fc.record({
  emailEnabled: fc.boolean(),
  inAppEnabled: fc.boolean(),
  applicationUpdates: fc.boolean(),
  batchSummaries: fc.boolean(),
});

// Arbitrary for generating notification types
const notificationTypeArb = fc.constantFrom(
  NotificationType.APPLICATION_SUBMITTED,
  NotificationType.APPLICATION_FAILED,
  NotificationType.BATCH_COMPLETE,
);

// Arbitrary for generating notification channels
const channelsArb = fc.subarray(
  [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
  { minLength: 1 },
);

// Create a mock preferences object
function createMockPreferences(
  prefs: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
    applicationUpdates: boolean;
    batchSummaries: boolean;
  },
): NotificationPreferences {
  return {
    userId: new Types.ObjectId(),
    ...prefs,
  } as NotificationPreferences;
}

describe('Notification Preference Respect Property Tests', () => {
  let notificationService: NotificationService;

  beforeEach(() => {
    // Create service instance with null dependencies since we're testing preference logic directly
    notificationService = new NotificationService(null as any, null as any);
  });

  /**
   * Property: Email channel is only enabled when emailEnabled is true
   */
  it('should respect emailEnabled preference', async () => {
    await fc.assert(
      fc.asyncProperty(preferencesArb, channelsArb, async (prefs, channels) => {
        const preferences = createMockPreferences(prefs);
        const filtered = notificationService.filterEnabledChannels(channels, preferences);

        if (prefs.emailEnabled) {
          // If email is enabled and requested, it should be in filtered
          if (channels.includes(NotificationChannel.EMAIL)) {
            expect(filtered.includes(NotificationChannel.EMAIL)).toBe(true);
          }
        } else {
          // If email is disabled, it should never be in filtered
          expect(filtered.includes(NotificationChannel.EMAIL)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: In-app channel is only enabled when inAppEnabled is true
   */
  it('should respect inAppEnabled preference', async () => {
    await fc.assert(
      fc.asyncProperty(preferencesArb, channelsArb, async (prefs, channels) => {
        const preferences = createMockPreferences(prefs);
        const filtered = notificationService.filterEnabledChannels(channels, preferences);

        if (prefs.inAppEnabled) {
          // If in-app is enabled and requested, it should be in filtered
          if (channels.includes(NotificationChannel.IN_APP)) {
            expect(filtered.includes(NotificationChannel.IN_APP)).toBe(true);
          }
        } else {
          // If in-app is disabled, it should never be in filtered
          expect(filtered.includes(NotificationChannel.IN_APP)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: APPLICATION_SUBMITTED type respects applicationUpdates preference
   */
  it('should respect applicationUpdates for APPLICATION_SUBMITTED', async () => {
    await fc.assert(
      fc.asyncProperty(preferencesArb, async (prefs) => {
        const preferences = createMockPreferences(prefs);
        const isEnabled = notificationService.isNotificationTypeEnabled(
          NotificationType.APPLICATION_SUBMITTED,
          preferences,
        );

        expect(isEnabled).toBe(prefs.applicationUpdates);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: APPLICATION_FAILED type respects applicationUpdates preference
   */
  it('should respect applicationUpdates for APPLICATION_FAILED', async () => {
    await fc.assert(
      fc.asyncProperty(preferencesArb, async (prefs) => {
        const preferences = createMockPreferences(prefs);
        const isEnabled = notificationService.isNotificationTypeEnabled(
          NotificationType.APPLICATION_FAILED,
          preferences,
        );

        expect(isEnabled).toBe(prefs.applicationUpdates);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: BATCH_COMPLETE type respects batchSummaries preference
   */
  it('should respect batchSummaries for BATCH_COMPLETE', async () => {
    await fc.assert(
      fc.asyncProperty(preferencesArb, async (prefs) => {
        const preferences = createMockPreferences(prefs);
        const isEnabled = notificationService.isNotificationTypeEnabled(
          NotificationType.BATCH_COMPLETE,
          preferences,
        );

        expect(isEnabled).toBe(prefs.batchSummaries);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Filtered channels is always a subset of requested channels
   */
  it('should only return subset of requested channels', async () => {
    await fc.assert(
      fc.asyncProperty(preferencesArb, channelsArb, async (prefs, channels) => {
        const preferences = createMockPreferences(prefs);
        const filtered = notificationService.filterEnabledChannels(channels, preferences);

        // Every filtered channel must be in the original requested channels
        for (const channel of filtered) {
          expect(channels.includes(channel)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When all channels disabled, filtered result is empty
   */
  it('should return empty when all channels disabled', async () => {
    await fc.assert(
      fc.asyncProperty(channelsArb, async (channels) => {
        const preferences = createMockPreferences({
          emailEnabled: false,
          inAppEnabled: false,
          applicationUpdates: true,
          batchSummaries: true,
        });
        const filtered = notificationService.filterEnabledChannels(channels, preferences);

        expect(filtered.length).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When all channels enabled, filtered equals requested
   */
  it('should return all requested when all channels enabled', async () => {
    await fc.assert(
      fc.asyncProperty(channelsArb, async (channels) => {
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
      }),
      { numRuns: 100 },
    );
  });
});
