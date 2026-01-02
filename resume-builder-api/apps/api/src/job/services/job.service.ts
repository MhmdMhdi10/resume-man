import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { JobRepository, JobSearchFilters, PaginatedJobs } from '../repositories/job.repository';
import { JobSyncWorker, SyncResult } from '../workers/job-sync.worker';
import { JobinjaAdapter } from '../adapters/jobinja.adapter';
import { JobDocument } from '../schemas/job.schema';
import { IJobListing, IJobSearchQuery } from '@app/shared';

export interface JobListingResponse {
  id: string;
  jabinjaId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  category: string;
  experienceLevel: string;
  postedAt: Date;
  applicationUrl: string;
}

export interface PaginatedJobsResponse {
  jobs: JobListingResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly jobSyncWorker: JobSyncWorker,
    private readonly jobinjaAdapter: JobinjaAdapter,
  ) {}

  async searchJobs(query: IJobSearchQuery): Promise<PaginatedJobsResponse> {
    this.logger.debug(`Searching jobs with query: ${JSON.stringify(query)}`);

    const filters: JobSearchFilters = {
      keyword: query.keyword,
      location: query.location,
      category: query.category,
      experienceLevel: query.experienceLevel,
    };

    // First try to get from database
    const result = await this.jobRepository.search(filters, query.page, query.limit);

    // If no jobs in database, fetch directly from Jobinja
    if (result.total === 0) {
      this.logger.debug('No jobs in database, fetching directly from Jobinja');
      return this.fetchFromJobinja(query);
    }

    return {
      jobs: result.jobs.map(this.mapToJobListing),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  private async fetchFromJobinja(query: IJobSearchQuery): Promise<PaginatedJobsResponse> {
    try {
      const jobs = await this.jobinjaAdapter.fetchJobs({
        query: query.keyword,
        location: query.location,
        category: query.category,
        page: query.page || 1,
      });

      // Map Jobinja jobs to response format
      const mappedJobs: JobListingResponse[] = jobs.map(job => ({
        id: job.id,
        jabinjaId: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        description: job.description,
        requirements: job.requirements,
        category: job.category,
        experienceLevel: job.experienceLevel,
        postedAt: job.postedAt,
        applicationUrl: job.applicationUrl,
      }));

      // Apply limit
      const limit = query.limit || 10;
      const paginatedJobs = mappedJobs.slice(0, limit);

      return {
        jobs: paginatedJobs,
        total: jobs.length,
        page: query.page || 1,
        limit: limit,
        totalPages: Math.ceil(jobs.length / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch from Jobinja: ${error}`);
      return {
        jobs: [],
        total: 0,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: 0,
      };
    }
  }

  async getJob(jobId: string): Promise<JobListingResponse> {
    const job = await this.jobRepository.findById(jobId);

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found`);
    }

    return this.mapToJobListing(job);
  }

  async getJobByJabinjaId(jabinjaId: string): Promise<JobListingResponse | null> {
    const job = await this.jobRepository.findByJabinjaId(jabinjaId);
    return job ? this.mapToJobListing(job) : null;
  }

  async syncJobs(): Promise<SyncResult> {
    return this.jobSyncWorker.syncJobs();
  }

  async syncJobsByCategory(category: string): Promise<SyncResult> {
    return this.jobSyncWorker.syncByCategory(category);
  }

  async getRecentJobs(limit: number = 10): Promise<JobListingResponse[]> {
    const jobs = await this.jobRepository.getRecentJobs(limit);
    return jobs.map(this.mapToJobListing);
  }

  async getCategoryStats(): Promise<Record<string, number>> {
    return this.jobRepository.countByCategory();
  }

  /**
   * Filter jobs based on multiple criteria
   * All specified filters must match (AND logic)
   */
  filterJobs(
    jobs: JobListingResponse[],
    filters: JobSearchFilters,
  ): JobListingResponse[] {
    return jobs.filter((job) => {
      // Location filter (case-insensitive partial match)
      if (filters.location) {
        const locationMatch = job.location
          .toLowerCase()
          .includes(filters.location.toLowerCase());
        if (!locationMatch) return false;
      }

      // Category filter (case-insensitive partial match)
      if (filters.category) {
        const categoryMatch = job.category
          .toLowerCase()
          .includes(filters.category.toLowerCase());
        if (!categoryMatch) return false;
      }

      // Experience level filter (exact match)
      if (filters.experienceLevel) {
        if (job.experienceLevel !== filters.experienceLevel) return false;
      }

      // Keyword filter (search in title, company, description)
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        const keywordMatch =
          job.title.toLowerCase().includes(keyword) ||
          job.company.toLowerCase().includes(keyword) ||
          job.description.toLowerCase().includes(keyword);
        if (!keywordMatch) return false;
      }

      return true;
    });
  }

  private mapToJobListing(job: JobDocument): JobListingResponse {
    return {
      id: job._id.toString(),
      jabinjaId: job.jabinjaId,
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      requirements: job.requirements,
      category: job.category,
      experienceLevel: job.experienceLevel,
      postedAt: job.postedAt,
      applicationUrl: job.applicationUrl,
    };
  }
}
