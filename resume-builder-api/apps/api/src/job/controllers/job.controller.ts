import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JobSearchQueryDto } from '@app/shared';
import { JobService, PaginatedJobsResponse, JobListingResponse } from '../services/job.service';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  /**
   * Search jobs with optional filters
   * GET /jobs?keyword=developer&location=NYC&category=tech&experienceLevel=mid&page=1&limit=20
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async searchJobs(
    @Query() query: JobSearchQueryDto,
  ): Promise<PaginatedJobsResponse> {
    return this.jobService.searchJobs({
      keyword: query.keyword,
      location: query.location,
      category: query.category,
      experienceLevel: query.experienceLevel,
      page: query.page,
      limit: query.limit,
    });
  }

  /**
   * Get job details by ID
   * GET /jobs/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getJob(@Param('id') jobId: string): Promise<JobListingResponse> {
    return this.jobService.getJob(jobId);
  }
}
