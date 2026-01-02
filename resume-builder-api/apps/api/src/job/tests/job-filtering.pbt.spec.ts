/**
 * Feature: resume-builder-auto-sender
 * Property 3: Job Filtering Correctness
 * Validates: Requirements 5.3
 *
 * For any set of job listings and filter criteria (location, category, experience level),
 * the filtered results should only contain jobs that match ALL specified criteria.
 */

import * as fc from 'fast-check';
import { ExperienceLevel } from '@app/shared';
import { JobService, JobListingResponse } from '../services/job.service';
import { JobSearchFilters } from '../repositories/job.repository';

// Arbitrary for generating job listings
const jobListingArb = fc.record({
  id: fc.uuid(),
  jabinjaId: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  company: fc.string({ minLength: 1, maxLength: 100 }),
  location: fc.oneof(
    fc.constant('New York'),
    fc.constant('San Francisco'),
    fc.constant('Los Angeles'),
    fc.constant('Chicago'),
    fc.constant('Remote'),
    fc.string({ minLength: 1, maxLength: 50 }),
  ),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  requirements: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 5 }),
  category: fc.oneof(
    fc.constant('Engineering'),
    fc.constant('Design'),
    fc.constant('Marketing'),
    fc.constant('Sales'),
    fc.constant('Finance'),
    fc.string({ minLength: 1, maxLength: 50 }),
  ),
  experienceLevel: fc.constantFrom(
    ExperienceLevel.ENTRY,
    ExperienceLevel.MID,
    ExperienceLevel.SENIOR,
    ExperienceLevel.LEAD,
  ),
  postedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  applicationUrl: fc.webUrl(),
});

// Arbitrary for generating filter criteria
const filtersArb = fc.record({
  location: fc.option(
    fc.oneof(
      fc.constant('New York'),
      fc.constant('San Francisco'),
      fc.constant('Remote'),
      fc.string({ minLength: 1, maxLength: 20 }),
    ),
    { nil: undefined },
  ),
  category: fc.option(
    fc.oneof(
      fc.constant('Engineering'),
      fc.constant('Design'),
      fc.constant('Marketing'),
      fc.string({ minLength: 1, maxLength: 20 }),
    ),
    { nil: undefined },
  ),
  experienceLevel: fc.option(
    fc.constantFrom(
      ExperienceLevel.ENTRY,
      ExperienceLevel.MID,
      ExperienceLevel.SENIOR,
      ExperienceLevel.LEAD,
    ),
    { nil: undefined },
  ),
  keyword: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
});

describe('Job Filtering Property Tests', () => {
  let jobService: JobService;

  beforeEach(() => {
    // Create a minimal JobService instance for testing filterJobs method
    jobService = new JobService(null as any, null as any);
  });

  /**
   * Property: All filtered results must match location filter
   */
  it('should only return jobs matching location filter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(jobListingArb, { minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (jobs, locationFilter) => {
          const filters: JobSearchFilters = { location: locationFilter };
          const filtered = jobService.filterJobs(jobs, filters);

          // All filtered jobs must contain the location filter (case-insensitive)
          for (const job of filtered) {
            expect(
              job.location.toLowerCase().includes(locationFilter.toLowerCase()),
            ).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: All filtered results must match category filter
   */
  it('should only return jobs matching category filter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(jobListingArb, { minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        async (jobs, categoryFilter) => {
          const filters: JobSearchFilters = { category: categoryFilter };
          const filtered = jobService.filterJobs(jobs, filters);

          for (const job of filtered) {
            expect(
              job.category.toLowerCase().includes(categoryFilter.toLowerCase()),
            ).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: All filtered results must match experience level filter
   */
  it('should only return jobs matching experience level filter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(jobListingArb, { minLength: 1, maxLength: 50 }),
        fc.constantFrom(
          ExperienceLevel.ENTRY,
          ExperienceLevel.MID,
          ExperienceLevel.SENIOR,
          ExperienceLevel.LEAD,
        ),
        async (jobs, levelFilter) => {
          const filters: JobSearchFilters = { experienceLevel: levelFilter };
          const filtered = jobService.filterJobs(jobs, filters);

          for (const job of filtered) {
            expect(job.experienceLevel).toBe(levelFilter);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: All filtered results must match ALL specified criteria (AND logic)
   */
  it('should only return jobs matching ALL filter criteria', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(jobListingArb, { minLength: 1, maxLength: 50 }),
        filtersArb,
        async (jobs, filters) => {
          const filtered = jobService.filterJobs(jobs, filters);

          for (const job of filtered) {
            // Check location if specified
            if (filters.location) {
              expect(
                job.location.toLowerCase().includes(filters.location.toLowerCase()),
              ).toBe(true);
            }

            // Check category if specified
            if (filters.category) {
              expect(
                job.category.toLowerCase().includes(filters.category.toLowerCase()),
              ).toBe(true);
            }

            // Check experience level if specified
            if (filters.experienceLevel) {
              expect(job.experienceLevel).toBe(filters.experienceLevel);
            }

            // Check keyword if specified
            if (filters.keyword) {
              const keyword = filters.keyword.toLowerCase();
              const matchesKeyword =
                job.title.toLowerCase().includes(keyword) ||
                job.company.toLowerCase().includes(keyword) ||
                job.description.toLowerCase().includes(keyword);
              expect(matchesKeyword).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Filtered results should be a subset of original jobs
   */
  it('should return subset of original jobs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(jobListingArb, { minLength: 0, maxLength: 50 }),
        filtersArb,
        async (jobs, filters) => {
          const filtered = jobService.filterJobs(jobs, filters);

          expect(filtered.length).toBeLessThanOrEqual(jobs.length);

          // All filtered jobs should exist in original list
          const originalIds = new Set(jobs.map((j) => j.id));
          for (const job of filtered) {
            expect(originalIds.has(job.id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Empty filters should return all jobs
   */
  it('should return all jobs when no filters specified', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(jobListingArb, { minLength: 0, maxLength: 50 }),
        async (jobs) => {
          const filters: JobSearchFilters = {};
          const filtered = jobService.filterJobs(jobs, filters);

          expect(filtered.length).toBe(jobs.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Filtering should be idempotent
   */
  it('should be idempotent - filtering twice gives same result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(jobListingArb, { minLength: 0, maxLength: 50 }),
        filtersArb,
        async (jobs, filters) => {
          const filtered1 = jobService.filterJobs(jobs, filters);
          const filtered2 = jobService.filterJobs(filtered1, filters);

          expect(filtered2.length).toBe(filtered1.length);
          expect(filtered2.map((j) => j.id).sort()).toEqual(
            filtered1.map((j) => j.id).sort(),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: No matching jobs should return empty array
   */
  it('should return empty array when no jobs match', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(jobListingArb, { minLength: 1, maxLength: 20 }),
        async (jobs) => {
          // Use a filter that won't match any job
          const impossibleFilter: JobSearchFilters = {
            location: 'ZZZZNONEXISTENT_LOCATION_12345ZZZZ',
          };
          const filtered = jobService.filterJobs(jobs, impossibleFilter);

          expect(filtered.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Order of filters should not affect result
   */
  it('should produce same results regardless of filter application order', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(jobListingArb, { minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.constantFrom(
          ExperienceLevel.ENTRY,
          ExperienceLevel.MID,
          ExperienceLevel.SENIOR,
          ExperienceLevel.LEAD,
        ),
        async (jobs, location, level) => {
          // Apply both filters at once
          const combinedFilters: JobSearchFilters = {
            location,
            experienceLevel: level,
          };
          const combinedResult = jobService.filterJobs(jobs, combinedFilters);

          // Apply filters sequentially
          const locationFirst = jobService.filterJobs(jobs, { location });
          const sequentialResult = jobService.filterJobs(locationFirst, {
            experienceLevel: level,
          });

          // Results should be the same
          expect(combinedResult.length).toBe(sequentialResult.length);
          expect(combinedResult.map((j) => j.id).sort()).toEqual(
            sequentialResult.map((j) => j.id).sort(),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
