import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ApplicationStatus } from '@app/shared';
import { Application, ApplicationDocument, isValidStatusTransition } from '../schemas/application.schema';
import { ApplicationQueueService, QueuedApplicationItem } from './application-queue.service';

export interface BatchApplicationDto {
  resumeId: string;
  jobIds: string[];
  coverLetter?: string;
}

export interface QueuedApplicationResponse {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  queuedAt: Date;
}

export interface QueuedApplicationsResult {
  batchId: string;
  applications: QueuedApplicationResponse[];
  totalCount: number;
}

export interface ApplicationFilters {
  status?: ApplicationStatus;
  jobId?: string;
  fromDate?: Date;
  toDate?: Date;
  batchId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AutoSenderService {
  private readonly logger = new Logger(AutoSenderService.name);

  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
    private readonly queueService: ApplicationQueueService,
  ) {}

  /**
   * Queue multiple job applications for processing
   */
  async queueApplications(
    userId: string,
    dto: BatchApplicationDto,
  ): Promise<QueuedApplicationsResult> {
    const batchId = uuidv4();
    const userObjectId = new Types.ObjectId(userId);
    const resumeObjectId = new Types.ObjectId(dto.resumeId);

    const applications: ApplicationDocument[] = [];
    const queueItems: QueuedApplicationItem[] = [];

    for (const jobId of dto.jobIds) {
      const jobObjectId = new Types.ObjectId(jobId);

      // Check if application already exists for this user and job
      const existing = await this.applicationModel.findOne({
        userId: userObjectId,
        jobId: jobObjectId,
        status: { $nin: [ApplicationStatus.FAILED, ApplicationStatus.CANCELLED] },
      });

      if (existing) {
        this.logger.warn(`Application already exists for user ${userId} and job ${jobId}`);
        continue;
      }

      const application = new this.applicationModel({
        userId: userObjectId,
        jobId: jobObjectId,
        resumeId: resumeObjectId,
        batchId,
        status: ApplicationStatus.PENDING,
        coverLetter: dto.coverLetter,
      });

      const saved = await application.save();
      applications.push(saved);

      queueItems.push({
        applicationId: saved._id.toString(),
        userId,
        jobId,
        resumeId: dto.resumeId,
        queuedAt: new Date(),
      });
    }

    // Enqueue all applications
    if (queueItems.length > 0) {
      await this.queueService.enqueueBatch(queueItems);
    }

    this.logger.log(`Queued ${applications.length} applications in batch ${batchId}`);

    return {
      batchId,
      applications: applications.map((app) => ({
        id: app._id.toString(),
        jobId: app.jobId.toString(),
        status: app.status,
        queuedAt: (app as any).createdAt,
      })),
      totalCount: applications.length,
    };
  }

  /**
   * Get the status of a specific application
   */
  async getApplicationStatus(
    userId: string,
    applicationId: string,
  ): Promise<Application> {
    const application = await this.applicationModel.findOne({
      _id: new Types.ObjectId(applicationId),
      userId: new Types.ObjectId(userId),
    });

    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    return application;
  }

  /**
   * Get paginated list of applications with optional filters
   */
  async getApplications(
    userId: string,
    filters: ApplicationFilters = {},
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<Application>> {
    const query: any = { userId: new Types.ObjectId(userId) };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.jobId) {
      query.jobId = new Types.ObjectId(filters.jobId);
    }

    if (filters.batchId) {
      query.batchId = filters.batchId;
    }

    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) {
        query.createdAt.$gte = filters.fromDate;
      }
      if (filters.toDate) {
        query.createdAt.$lte = filters.toDate;
      }
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.applicationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.applicationModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cancel a pending application
   */
  async cancelApplication(userId: string, applicationId: string): Promise<Application> {
    const application = await this.applicationModel.findOne({
      _id: new Types.ObjectId(applicationId),
      userId: new Types.ObjectId(userId),
    });

    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (!isValidStatusTransition(application.status, ApplicationStatus.CANCELLED)) {
      throw new BadRequestException(
        `Cannot cancel application in ${application.status} status`,
      );
    }

    // Remove from queue if still pending
    if (application.status === ApplicationStatus.PENDING) {
      await this.queueService.removeFromQueue(applicationId);
    }

    application.status = ApplicationStatus.CANCELLED;
    await application.save();

    this.logger.log(`Cancelled application ${applicationId}`);
    return application;
  }

  /**
   * Update application status with validation
   */
  async updateApplicationStatus(
    applicationId: string,
    newStatus: ApplicationStatus,
    additionalData?: {
      confirmationId?: string;
      errorMessage?: string;
      submittedAt?: Date;
    },
  ): Promise<Application> {
    const application = await this.applicationModel.findById(applicationId);

    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (!isValidStatusTransition(application.status, newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${application.status} to ${newStatus}`,
      );
    }

    application.status = newStatus;

    if (additionalData?.confirmationId) {
      application.confirmationId = additionalData.confirmationId;
    }

    if (additionalData?.errorMessage) {
      application.errorMessage = additionalData.errorMessage;
    }

    if (additionalData?.submittedAt) {
      application.submittedAt = additionalData.submittedAt;
    }

    await application.save();
    this.logger.debug(`Updated application ${applicationId} status to ${newStatus}`);

    return application;
  }

  /**
   * Increment retry count for an application
   */
  async incrementRetryCount(applicationId: string): Promise<number> {
    const application = await this.applicationModel.findByIdAndUpdate(
      applicationId,
      { $inc: { retryCount: 1 } },
      { new: true },
    );

    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    return application.retryCount;
  }

  /**
   * Get application by ID (internal use)
   */
  async getApplicationById(applicationId: string): Promise<Application | null> {
    return this.applicationModel.findById(applicationId);
  }

  /**
   * Get applications by batch ID
   */
  async getApplicationsByBatchId(
    userId: string,
    batchId: string,
  ): Promise<Application[]> {
    return this.applicationModel.find({
      userId: new Types.ObjectId(userId),
      batchId,
    });
  }
}
