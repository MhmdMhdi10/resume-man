import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobinjaAdapter } from '../adapters/jobinja.adapter';
import { JobRepository } from '../repositories/job.repository';

export interface SyncResult {
  success: boolean;
  jobsSynced: number;
  errors: string[];
  duration: number;
}

@Injectable()
export class JobSyncWorker implements OnModuleInit {
  private readonly logger = new Logger(JobSyncWorker.name);
  private readonly syncEnabled: boolean;
  private readonly pagesToSync: number;
  private isSyncing = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly jobinjaAdapter: JobinjaAdapter,
    private readonly jobRepository: JobRepository,
  ) {
    this.syncEnabled = this.configService.get<boolean>('JOB_SYNC_ENABLED', false);
    this.pagesToSync = this.configService.get<number>('JOB_SYNC_PAGES', 5);
  }

  async onModuleInit() {
    if (this.syncEnabled) {
      this.logger.log('Job sync worker initialized, will sync on schedule');
    } else {
      this.logger.log('Job sync worker disabled');
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSync(): Promise<void> {
    if (!this.syncEnabled) {
      return;
    }

    this.logger.log('Starting scheduled job sync');
    await this.syncJobs();
  }

  async syncJobs(): Promise<SyncResult> {
    if (this.isSyncing) {
      this.logger.warn('Sync already in progress, skipping');
      return {
        success: false,
        jobsSynced: 0,
        errors: ['Sync already in progress'],
        duration: 0,
      };
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let totalJobsSynced = 0;

    try {
      for (let page = 1; page <= this.pagesToSync; page++) {
        try {
          this.logger.debug(`Syncing page ${page}`);
          
          const jobs = await this.jobinjaAdapter.fetchJobs({ page });
          
          if (jobs.length === 0) {
            this.logger.debug(`No more jobs found at page ${page}, stopping sync`);
            break;
          }

          const synced = await this.jobRepository.bulkUpsertFromJabinja(jobs);
          totalJobsSynced += synced;
          
          this.logger.debug(`Synced ${synced} jobs from page ${page}`);
        } catch (error) {
          const errorMessage = `Failed to sync page ${page}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMessage);
          errors.push(errorMessage);
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Job sync completed: ${totalJobsSynced} jobs synced in ${duration}ms`);

      return {
        success: errors.length === 0,
        jobsSynced: totalJobsSynced,
        errors,
        duration,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  async syncByCategory(category: string): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        jobsSynced: 0,
        errors: ['Sync already in progress'],
        duration: 0,
      };
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let totalJobsSynced = 0;

    try {
      for (let page = 1; page <= this.pagesToSync; page++) {
        try {
          const jobs = await this.jobinjaAdapter.fetchJobs({ category, page });
          
          if (jobs.length === 0) break;

          const synced = await this.jobRepository.bulkUpsertFromJabinja(jobs);
          totalJobsSynced += synced;
        } catch (error) {
          errors.push(`Failed to sync category ${category} page ${page}`);
        }
      }

      return {
        success: errors.length === 0,
        jobsSynced: totalJobsSynced,
        errors,
        duration: Date.now() - startTime,
      };
    } finally {
      this.isSyncing = false;
    }
  }
}
