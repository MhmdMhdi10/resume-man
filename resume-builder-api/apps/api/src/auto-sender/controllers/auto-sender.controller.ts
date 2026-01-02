import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApplicationStatus } from '@app/shared';
import {
  AutoSenderService,
  BatchApplicationDto,
  ApplicationFilters,
} from '../services/auto-sender.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

class BatchApplicationRequestDto {
  resumeId: string;
  jobIds: string[];
  coverLetter?: string;
}

class ApplicationFiltersDto {
  status?: ApplicationStatus;
  jobId?: string;
  fromDate?: string;
  toDate?: string;
  batchId?: string;
  page?: number;
  limit?: number;
}

@Controller('applications')
export class AutoSenderController {
  constructor(private readonly autoSenderService: AutoSenderService) {}

  /**
   * POST /applications/batch - Queue multiple job applications
   */
  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  async queueBatchApplications(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BatchApplicationRequestDto,
  ) {
    const batchDto: BatchApplicationDto = {
      resumeId: dto.resumeId,
      jobIds: dto.jobIds,
      coverLetter: dto.coverLetter,
    };

    return this.autoSenderService.queueApplications(req.user.userId, batchDto);
  }

  /**
   * GET /applications - Get list of applications with optional filters
   */
  @Get()
  async getApplications(
    @Request() req: AuthenticatedRequest,
    @Query() query: ApplicationFiltersDto,
  ) {
    const filters: ApplicationFilters = {};

    if (query.status) {
      filters.status = query.status;
    }

    if (query.jobId) {
      filters.jobId = query.jobId;
    }

    if (query.batchId) {
      filters.batchId = query.batchId;
    }

    if (query.fromDate) {
      filters.fromDate = new Date(query.fromDate);
    }

    if (query.toDate) {
      filters.toDate = new Date(query.toDate);
    }

    const page = query.page ? parseInt(String(query.page), 10) : 1;
    const limit = query.limit ? parseInt(String(query.limit), 10) : 20;

    return this.autoSenderService.getApplications(
      req.user.userId,
      filters,
      page,
      limit,
    );
  }

  /**
   * GET /applications/:id - Get application status
   */
  @Get(':id')
  async getApplicationStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') applicationId: string,
  ) {
    return this.autoSenderService.getApplicationStatus(req.user.userId, applicationId);
  }

  /**
   * GET /applications/batch/:batchId - Get all applications in a batch
   */
  @Get('batch/:batchId')
  async getApplicationsByBatch(
    @Request() req: AuthenticatedRequest,
    @Param('batchId') batchId: string,
  ) {
    return this.autoSenderService.getApplicationsByBatchId(req.user.userId, batchId);
  }

  /**
   * DELETE /applications/:id - Cancel a pending application
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancelApplication(
    @Request() req: AuthenticatedRequest,
    @Param('id') applicationId: string,
  ) {
    return this.autoSenderService.cancelApplication(req.user.userId, applicationId);
  }
}
