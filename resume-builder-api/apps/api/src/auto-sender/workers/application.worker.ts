import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationStatus, NotificationType, NotificationChannel } from '@app/shared';
import { Application, ApplicationDocument } from '../schemas/application.schema';
import { ApplicationQueueService, QueuedApplicationItem } from '../services/application-queue.service';
import { AutoSenderService } from '../services/auto-sender.service';
import { JabinjaAdapter, ApplicationPayload } from '../../job/adapters/jabinja.adapter';
import { Resume, ResumeDocument } from '../../resume/schemas/resume.schema';
import { Profile, ProfileDocument } from '../../profile/schemas/profile.schema';
import { StorageService } from '../../resume/services/storage.service';
import { NotificationService } from '../../notification/services/notification.service';

export interface ProcessResult {
  success: boolean;
  confirmationId?: string;
  shouldRetry: boolean;
  errorMessage?: string;
}

@Injectable()
export class ApplicationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApplicationWorker.name);
  private readonly maxRetries: number;
  private readonly pollIntervalMs: number;
  private isRunning = false;
  private pollTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly queueService: ApplicationQueueService,
    private readonly autoSenderService: AutoSenderService,
    private readonly jabinjaAdapter: JabinjaAdapter,
    private readonly storageService: StorageService,
    private readonly notificationService: NotificationService,
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<ResumeDocument>,
    @InjectModel(Profile.name)
    private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(Application.name)
    private readonly applicationModel: Model<ApplicationDocument>,
  ) {
    this.maxRetries = this.configService.get<number>('APPLICATION_MAX_RETRIES', 3);
    this.pollIntervalMs = this.configService.get<number>('APPLICATION_POLL_INTERVAL_MS', 5000);
  }

  async onModuleInit() {
    const autoStart = this.configService.get<boolean>('APPLICATION_WORKER_AUTO_START', true);
    if (autoStart) {
      this.start();
    }
  }

  async onModuleDestroy() {
    this.stop();
  }

  /**
   * Start the worker
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Worker is already running');
      return;
    }

    this.isRunning = true;
    this.logger.log('Application worker started');
    this.poll();
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.isRunning = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
    this.logger.log('Application worker stopped');
  }

  /**
   * Poll the queue for applications to process
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.processQueue();
    } catch (error) {
      this.logger.error(`Error in poll cycle: ${error}`);
    }

    // Schedule next poll
    this.pollTimeout = setTimeout(() => this.poll(), this.pollIntervalMs);
  }

  /**
   * Process applications from the queue
   */
  async processQueue(): Promise<void> {
    const item = await this.queueService.dequeue();

    if (!item) {
      return;
    }

    this.logger.debug(`Processing application ${item.applicationId}`);

    try {
      // Update status to PROCESSING
      await this.autoSenderService.updateApplicationStatus(
        item.applicationId,
        ApplicationStatus.PROCESSING,
      );

      const result = await this.processApplication(item);

      if (result.success) {
        await this.autoSenderService.updateApplicationStatus(
          item.applicationId,
          ApplicationStatus.SUBMITTED,
          {
            confirmationId: result.confirmationId,
            submittedAt: new Date(),
          },
        );
        this.logger.log(`Application ${item.applicationId} submitted successfully`);

        // Send success notification
        await this.sendSubmissionNotification(item.userId, item.applicationId, item.jobId);
      } else if (result.shouldRetry) {
        await this.handleRetry(item, result.errorMessage);
      } else {
        await this.autoSenderService.updateApplicationStatus(
          item.applicationId,
          ApplicationStatus.FAILED,
          { errorMessage: result.errorMessage },
        );
        this.logger.warn(`Application ${item.applicationId} failed: ${result.errorMessage}`);

        // Send failure notification
        await this.sendFailureNotification(item.userId, item.applicationId, item.jobId, result.errorMessage);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing application ${item.applicationId}: ${errorMessage}`);

      await this.handleRetry(item, errorMessage);
    } finally {
      // Release the lock
      await this.queueService.releaseLock(item.applicationId, item.userId);
    }
  }

  /**
   * Process a single application
   */
  async processApplication(item: QueuedApplicationItem): Promise<ProcessResult> {
    // Get application details
    const application = await this.autoSenderService.getApplicationById(item.applicationId);
    if (!application) {
      return {
        success: false,
        shouldRetry: false,
        errorMessage: 'Application not found',
      };
    }

    // Get resume
    const resume = await this.resumeModel.findById(application.resumeId);
    if (!resume) {
      return {
        success: false,
        shouldRetry: false,
        errorMessage: 'Resume not found',
      };
    }

    // Get user profile
    const profile = await this.profileModel.findOne({ userId: application.userId });
    if (!profile) {
      return {
        success: false,
        shouldRetry: false,
        errorMessage: 'User profile not found',
      };
    }

    // Download resume file
    let resumeBuffer: Buffer;
    try {
      resumeBuffer = await this.storageService.getFile(resume.storageKey);
    } catch (error) {
      return {
        success: false,
        shouldRetry: false,
        errorMessage: 'Failed to download resume file',
      };
    }

    // Prepare application payload
    const payload: ApplicationPayload = {
      resumeFile: resumeBuffer,
      coverLetter: application.coverLetter,
      applicantInfo: {
        firstName: profile.personalInfo?.firstName ?? '',
        lastName: profile.personalInfo?.lastName ?? '',
        email: profile.personalInfo?.email ?? '',
        phone: profile.personalInfo?.phone ?? '',
      },
    };

    // Submit to Jabinja
    const result = await this.jabinjaAdapter.submitApplication(
      application.jobId.toString(),
      payload,
    );

    return {
      success: result.success,
      confirmationId: result.confirmationId,
      shouldRetry: !result.success,
      errorMessage: result.errorMessage,
    };
  }

  /**
   * Handle retry logic for failed applications
   */
  private async handleRetry(
    item: QueuedApplicationItem,
    errorMessage?: string,
  ): Promise<void> {
    const retryCount = await this.autoSenderService.incrementRetryCount(item.applicationId);

    if (retryCount < this.maxRetries) {
      // Requeue for retry
      await this.autoSenderService.updateApplicationStatus(
        item.applicationId,
        ApplicationStatus.PENDING,
        { errorMessage },
      );
      await this.queueService.requeue(item);
      this.logger.debug(
        `Application ${item.applicationId} requeued for retry (${retryCount}/${this.maxRetries})`,
      );
    } else {
      // Max retries exceeded
      const finalErrorMessage = `Max retries exceeded. Last error: ${errorMessage}`;
      await this.autoSenderService.updateApplicationStatus(
        item.applicationId,
        ApplicationStatus.FAILED,
        { errorMessage: finalErrorMessage },
      );
      this.logger.warn(
        `Application ${item.applicationId} failed after ${this.maxRetries} retries`,
      );

      // Send failure notification after all retries exhausted
      await this.sendFailureNotification(item.userId, item.applicationId, item.jobId, finalErrorMessage);
    }
  }

  /**
   * Send notification for successful submission
   */
  private async sendSubmissionNotification(
    userId: string,
    applicationId: string,
    jobId: string,
  ): Promise<void> {
    try {
      await this.notificationService.sendNotification(userId, {
        type: NotificationType.APPLICATION_SUBMITTED,
        title: 'Application Submitted',
        message: 'Your job application has been successfully submitted.',
        data: { applicationId, jobId },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });
    } catch (error) {
      this.logger.error(`Failed to send submission notification: ${error}`);
    }
  }

  /**
   * Send notification for failed submission
   */
  private async sendFailureNotification(
    userId: string,
    applicationId: string,
    jobId: string,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.notificationService.sendNotification(userId, {
        type: NotificationType.APPLICATION_FAILED,
        title: 'Application Failed',
        message: errorMessage || 'Your job application could not be submitted.',
        data: { applicationId, jobId, errorMessage },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });
    } catch (error) {
      this.logger.error(`Failed to send failure notification: ${error}`);
    }
  }

  /**
   * Send batch completion summary notification
   */
  async sendBatchCompletionNotification(
    userId: string,
    batchId: string,
    stats: { total: number; submitted: number; failed: number },
  ): Promise<void> {
    try {
      await this.notificationService.sendNotification(userId, {
        type: NotificationType.BATCH_COMPLETE,
        title: 'Batch Applications Complete',
        message: `Batch processing complete: ${stats.submitted} submitted, ${stats.failed} failed out of ${stats.total} applications.`,
        data: { batchId, ...stats },
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      });
    } catch (error) {
      this.logger.error(`Failed to send batch completion notification: ${error}`);
    }
  }

  /**
   * Get worker status
   */
  getStatus(): { isRunning: boolean; queueLength: Promise<number> } {
    return {
      isRunning: this.isRunning,
      queueLength: this.queueService.getQueueLength(),
    };
  }
}
