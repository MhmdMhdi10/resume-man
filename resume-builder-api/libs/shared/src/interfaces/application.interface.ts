import { ApplicationStatus } from '../enums';

export interface IApplication {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string;
  batchId: string;
  status: ApplicationStatus;
  retryCount: number;
  submittedAt?: Date;
  confirmationId?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQueuedApplication {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  queuedAt: Date;
}

export interface IQueuedApplications {
  batchId: string;
  applications: IQueuedApplication[];
  totalCount: number;
}

export interface IApplicationFilters {
  status?: ApplicationStatus;
  jobId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface IApplicationStats {
  totalApplications: number;
  submittedCount: number;
  pendingCount: number;
  failedCount: number;
  successRate: number;
}

export interface ITimelineData {
  date: Date;
  submitted: number;
  failed: number;
}
