/**
 * Feature: resume-builder-auto-sender
 * Property 12: Application Status Tracking
 * Validates: Requirements 6.3
 *
 * For any application in the queue, its status should accurately reflect its current state
 * (pending, processing, submitted, failed) and status transitions should be valid (no skipping states).
 */

import * as fc from 'fast-check';
import { ApplicationStatus } from '@app/shared';
import {
  VALID_STATUS_TRANSITIONS,
  isValidStatusTransition,
} from '../schemas/application.schema';

// All possible statuses
const allStatuses = Object.values(ApplicationStatus);

// Arbitrary for generating a random status
const statusArb = fc.constantFrom(...allStatuses);

// Arbitrary for generating a sequence of status transitions
const statusSequenceArb = fc.array(statusArb, { minLength: 1, maxLength: 10 });

describe('Application Status Tracking Property Tests', () => {
  /**
   * Property: Valid transitions are correctly identified
   */
  it('should correctly identify valid status transitions', async () => {
    await fc.assert(
      fc.asyncProperty(statusArb, statusArb, async (fromStatus, toStatus) => {
        const isValid = isValidStatusTransition(fromStatus, toStatus);
        const expectedValid = VALID_STATUS_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;

        expect(isValid).toBe(expectedValid);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: PENDING can only transition to PROCESSING or CANCELLED
   */
  it('should only allow PENDING to transition to PROCESSING or CANCELLED', async () => {
    await fc.assert(
      fc.asyncProperty(statusArb, async (toStatus) => {
        const isValid = isValidStatusTransition(ApplicationStatus.PENDING, toStatus);

        if (toStatus === ApplicationStatus.PROCESSING || toStatus === ApplicationStatus.CANCELLED) {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: PROCESSING can transition to SUBMITTED, FAILED, or back to PENDING
   */
  it('should only allow PROCESSING to transition to SUBMITTED, FAILED, or PENDING', async () => {
    await fc.assert(
      fc.asyncProperty(statusArb, async (toStatus) => {
        const isValid = isValidStatusTransition(ApplicationStatus.PROCESSING, toStatus);

        if (
          toStatus === ApplicationStatus.SUBMITTED ||
          toStatus === ApplicationStatus.FAILED ||
          toStatus === ApplicationStatus.PENDING
        ) {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: SUBMITTED is a terminal state (no transitions allowed)
   */
  it('should not allow any transitions from SUBMITTED', async () => {
    await fc.assert(
      fc.asyncProperty(statusArb, async (toStatus) => {
        const isValid = isValidStatusTransition(ApplicationStatus.SUBMITTED, toStatus);
        expect(isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: CANCELLED is a terminal state (no transitions allowed)
   */
  it('should not allow any transitions from CANCELLED', async () => {
    await fc.assert(
      fc.asyncProperty(statusArb, async (toStatus) => {
        const isValid = isValidStatusTransition(ApplicationStatus.CANCELLED, toStatus);
        expect(isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: FAILED can only transition to PENDING (for retry)
   */
  it('should only allow FAILED to transition to PENDING', async () => {
    await fc.assert(
      fc.asyncProperty(statusArb, async (toStatus) => {
        const isValid = isValidStatusTransition(ApplicationStatus.FAILED, toStatus);

        if (toStatus === ApplicationStatus.PENDING) {
          expect(isValid).toBe(true);
        } else {
          expect(isValid).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Cannot skip directly from PENDING to SUBMITTED
   */
  it('should not allow skipping from PENDING directly to SUBMITTED', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const isValid = isValidStatusTransition(
          ApplicationStatus.PENDING,
          ApplicationStatus.SUBMITTED,
        );
        expect(isValid).toBe(false);
      }),
      { numRuns: 10 },
    );
  });

  /**
   * Property: Cannot skip directly from PENDING to FAILED
   */
  it('should not allow skipping from PENDING directly to FAILED', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const isValid = isValidStatusTransition(
          ApplicationStatus.PENDING,
          ApplicationStatus.FAILED,
        );
        expect(isValid).toBe(false);
      }),
      { numRuns: 10 },
    );
  });

  /**
   * Property: Valid status sequence follows transition rules
   */
  it('should validate that a valid sequence follows transition rules', async () => {
    // Generate valid sequences starting from PENDING
    const validSequences = [
      [ApplicationStatus.PENDING, ApplicationStatus.PROCESSING, ApplicationStatus.SUBMITTED],
      [ApplicationStatus.PENDING, ApplicationStatus.PROCESSING, ApplicationStatus.FAILED],
      [ApplicationStatus.PENDING, ApplicationStatus.PROCESSING, ApplicationStatus.FAILED, ApplicationStatus.PENDING],
      [ApplicationStatus.PENDING, ApplicationStatus.CANCELLED],
      [ApplicationStatus.PENDING, ApplicationStatus.PROCESSING, ApplicationStatus.PENDING],
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...validSequences),
        async (sequence) => {
          for (let i = 0; i < sequence.length - 1; i++) {
            const isValid = isValidStatusTransition(sequence[i], sequence[i + 1]);
            expect(isValid).toBe(true);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property: Invalid sequences are rejected
   */
  it('should reject invalid status sequences', async () => {
    const invalidSequences = [
      [ApplicationStatus.PENDING, ApplicationStatus.SUBMITTED], // Skip PROCESSING
      [ApplicationStatus.PENDING, ApplicationStatus.FAILED], // Skip PROCESSING
      [ApplicationStatus.SUBMITTED, ApplicationStatus.PENDING], // From terminal
      [ApplicationStatus.CANCELLED, ApplicationStatus.PENDING], // From terminal
      [ApplicationStatus.SUBMITTED, ApplicationStatus.PROCESSING], // From terminal
      [ApplicationStatus.FAILED, ApplicationStatus.SUBMITTED], // Invalid from FAILED
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...invalidSequences),
        async (sequence) => {
          // At least one transition in the sequence should be invalid
          let hasInvalidTransition = false;
          for (let i = 0; i < sequence.length - 1; i++) {
            if (!isValidStatusTransition(sequence[i], sequence[i + 1])) {
              hasInvalidTransition = true;
              break;
            }
          }
          expect(hasInvalidTransition).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property: Self-transitions are not allowed
   */
  it('should not allow self-transitions', async () => {
    await fc.assert(
      fc.asyncProperty(statusArb, async (status) => {
        const isValid = isValidStatusTransition(status, status);
        expect(isValid).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Every non-terminal status has at least one valid transition
   */
  it('should have at least one valid transition for non-terminal statuses', async () => {
    const nonTerminalStatuses = [
      ApplicationStatus.PENDING,
      ApplicationStatus.PROCESSING,
      ApplicationStatus.FAILED,
    ];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...nonTerminalStatuses),
        async (status) => {
          const validTransitions = VALID_STATUS_TRANSITIONS[status];
          expect(validTransitions.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 30 },
    );
  });

  /**
   * Property: Terminal statuses have no valid transitions
   */
  it('should have no valid transitions for terminal statuses', async () => {
    const terminalStatuses = [ApplicationStatus.SUBMITTED, ApplicationStatus.CANCELLED];

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...terminalStatuses),
        async (status) => {
          const validTransitions = VALID_STATUS_TRANSITIONS[status];
          expect(validTransitions.length).toBe(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property: Transition validation is deterministic
   */
  it('should be deterministic - same inputs always give same result', async () => {
    await fc.assert(
      fc.asyncProperty(statusArb, statusArb, async (from, to) => {
        const result1 = isValidStatusTransition(from, to);
        const result2 = isValidStatusTransition(from, to);
        const result3 = isValidStatusTransition(from, to);

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      }),
      { numRuns: 100 },
    );
  });
});
