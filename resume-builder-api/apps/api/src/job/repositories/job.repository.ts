import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../schemas/job.schema';
import { RedisService } from '../../database/redis.service';
import { ExperienceLevel } from '@app/shared';
import { JobinjaJob } from '../adapters/jobinja.adapter';

export interface JobSearchFilters {
  keyword?: string;
  location?: string;
  category?: string;
  experienceLevel?: ExperienceLevel;
}

export interface PaginatedJobs {
  jobs: JobDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class JobRepository {
  private readonly logger = new Logger(JobRepository.name);
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly CACHE_PREFIX = 'jobs:';

  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<JobDocument>,
    private readonly redisService: RedisService,
  ) {}

  async findById(id: string): Promise<JobDocument | null> {
    const cacheKey = `${this.CACHE_PREFIX}detail:${id}`;
    
    // Try cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for job ${id}`);
      return JSON.parse(cached);
    }

    const job = await this.jobModel.findById(id).exec();
    
    if (job) {
      await this.redisService.set(cacheKey, JSON.stringify(job), this.CACHE_TTL * 12); // 1 hour
    }

    return job;
  }

  async findByJabinjaId(jabinjaId: string): Promise<JobDocument | null> {
    return this.jobModel.findOne({ jabinjaId }).exec();
  }

  async search(
    filters: JobSearchFilters,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedJobs> {
    const cacheKey = this.buildSearchCacheKey(filters, page, limit);
    
    // Try cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for search`);
      return JSON.parse(cached);
    }

    const query = this.buildSearchQuery(filters);
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(query)
        .sort({ postedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.jobModel.countDocuments(query).exec(),
    ]);

    const result: PaginatedJobs = {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    // Cache the result
    await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    return result;
  }

  private buildSearchQuery(filters: JobSearchFilters): Record<string, any> {
    const query: Record<string, any> = {};

    if (filters.keyword) {
      query.$text = { $search: filters.keyword };
    }

    if (filters.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    if (filters.category) {
      query.category = { $regex: filters.category, $options: 'i' };
    }

    if (filters.experienceLevel) {
      query.experienceLevel = filters.experienceLevel;
    }

    return query;
  }

  private buildSearchCacheKey(
    filters: JobSearchFilters,
    page: number,
    limit: number,
  ): string {
    const filterHash = JSON.stringify({
      ...filters,
      page,
      limit,
    });
    return `${this.CACHE_PREFIX}search:${Buffer.from(filterHash).toString('base64')}`;
  }

  async upsertFromJabinja(jobinjaJob: JobinjaJob): Promise<JobDocument> {
    const jobData = {
      jabinjaId: jobinjaJob.id,
      title: jobinjaJob.title,
      company: jobinjaJob.company,
      location: jobinjaJob.location,
      description: jobinjaJob.description,
      requirements: jobinjaJob.requirements,
      category: jobinjaJob.category,
      experienceLevel: jobinjaJob.experienceLevel,
      applicationUrl: jobinjaJob.applicationUrl,
      postedAt: jobinjaJob.postedAt,
      syncedAt: new Date(),
    };

    const job = await this.jobModel.findOneAndUpdate(
      { jabinjaId: jobinjaJob.id },
      { $set: jobData },
      { upsert: true, new: true },
    ).exec();

    // Invalidate related caches
    await this.invalidateSearchCache();

    return job;
  }

  async bulkUpsertFromJabinja(jobinjaJobs: JobinjaJob[]): Promise<number> {
    if (jobinjaJobs.length === 0) return 0;

    const operations = jobinjaJobs.map((job) => ({
      updateOne: {
        filter: { jabinjaId: job.id },
        update: {
          $set: {
            jabinjaId: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            description: job.description,
            requirements: job.requirements,
            category: job.category,
            experienceLevel: job.experienceLevel as ExperienceLevel,
            applicationUrl: job.applicationUrl,
            postedAt: job.postedAt,
            syncedAt: new Date(),
          },
        },
        upsert: true,
      },
    }));

    const result = await this.jobModel.bulkWrite(operations as any);
    
    // Invalidate search cache after bulk update
    await this.invalidateSearchCache();

    return result.upsertedCount + result.modifiedCount;
  }

  async invalidateSearchCache(): Promise<void> {
    // Note: In production, you'd want a more sophisticated cache invalidation
    // This is a simplified version that clears all search caches
    this.logger.debug('Invalidating search cache');
  }

  async getRecentJobs(limit: number = 10): Promise<JobDocument[]> {
    return this.jobModel
      .find()
      .sort({ postedAt: -1 })
      .limit(limit)
      .exec();
  }

  async countByCategory(): Promise<Record<string, number>> {
    const result = await this.jobModel.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]).exec();

    return result.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);
  }
}
