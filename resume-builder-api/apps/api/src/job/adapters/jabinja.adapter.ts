import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExperienceLevel } from '@app/shared';
import { withRetry, RetryConfig, RetryResult } from '../utils/retry.util';
import { CircuitBreaker, CircuitBreakerConfig } from '../utils/circuit-breaker.util';

export interface JabinjaSearchParams {
  query?: string;
  location?: string;
  category?: string;
  page: number;
}

export interface JabinjaJob {
  id: string;
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

export interface ApplicationPayload {
  resumeFile: Buffer;
  coverLetter?: string;
  applicantInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}

export interface SubmissionResult {
  success: boolean;
  confirmationId?: string;
  errorMessage?: string;
}

@Injectable()
export class JabinjaAdapter {
  private readonly logger = new Logger(JabinjaAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly retryConfig: RetryConfig;
  private readonly circuitBreaker: CircuitBreaker<JabinjaJob[]>;
  private readonly submissionCircuitBreaker: CircuitBreaker<SubmissionResult>;
  private cachedJobs: JabinjaJob[] = [];

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'JABINJA_API_URL',
      'https://api.jabinja.com',
    );
    this.apiKey = this.configService.get<string>('JABINJA_API_KEY', '');
    this.retryConfig = {
      maxRetries: this.configService.get<number>('JABINJA_MAX_RETRIES', 3),
      baseDelayMs: this.configService.get<number>('JABINJA_BASE_DELAY_MS', 1000),
      maxDelayMs: this.configService.get<number>('JABINJA_MAX_DELAY_MS', 30000),
      jitterFactor: 0.1,
    };

    const circuitBreakerConfig: Partial<CircuitBreakerConfig> = {
      failureThreshold: this.configService.get<number>('JABINJA_CB_FAILURE_THRESHOLD', 5),
      failureWindowMs: this.configService.get<number>('JABINJA_CB_FAILURE_WINDOW_MS', 60000),
      openDurationMs: this.configService.get<number>('JABINJA_CB_OPEN_DURATION_MS', 30000),
    };

    // Circuit breaker for job fetching with fallback to cached data
    this.circuitBreaker = new CircuitBreaker<JabinjaJob[]>(
      'jabinja-jobs',
      circuitBreakerConfig,
      () => this.getFallbackJobs(),
    );

    // Circuit breaker for application submission (no fallback)
    this.submissionCircuitBreaker = new CircuitBreaker<SubmissionResult>(
      'jabinja-submission',
      circuitBreakerConfig,
    );
  }

  private async getFallbackJobs(): Promise<JabinjaJob[]> {
    this.logger.warn('Using cached jobs as fallback');
    return this.cachedJobs;
  }

  setCachedJobs(jobs: JabinjaJob[]): void {
    this.cachedJobs = jobs;
  }

  async fetchJobs(params: JabinjaSearchParams): Promise<JabinjaJob[]> {
    this.logger.debug(`Fetching jobs with params: ${JSON.stringify(params)}`);

    const jobs = await this.circuitBreaker.execute(async () => {
      const result = await this.fetchJobsWithRetry(params);
      
      if (!result.success) {
        this.logger.error(`Failed to fetch jobs after ${result.attempts} attempts`);
        throw result.error;
      }

      return result.data!;
    });

    // Update cache on successful fetch
    if (jobs.length > 0) {
      this.cachedJobs = jobs;
    }

    return jobs;
  }

  async fetchJobsWithRetry(params: JabinjaSearchParams): Promise<RetryResult<JabinjaJob[]>> {
    return withRetry(
      () => this.doFetchJobs(params),
      this.retryConfig,
      this.logger,
    );
  }

  private async doFetchJobs(params: JabinjaSearchParams): Promise<JabinjaJob[]> {
    const queryParams = new URLSearchParams();
    if (params.query) queryParams.append('q', params.query);
    if (params.location) queryParams.append('location', params.location);
    if (params.category) queryParams.append('category', params.category);
    queryParams.append('page', params.page.toString());

    const url = `${this.baseUrl}/jobs?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Jabinja API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return this.mapJabinjaResponse(data);
  }

  async submitApplication(
    jobId: string,
    application: ApplicationPayload,
  ): Promise<SubmissionResult> {
    this.logger.debug(`Submitting application for job: ${jobId}`);

    try {
      return await this.submissionCircuitBreaker.execute(async () => {
        const result = await this.submitApplicationWithRetry(jobId, application);
        
        if (!result.success) {
          throw result.error || new Error('Unknown error after retries');
        }

        return result.data!;
      });
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async submitApplicationWithRetry(
    jobId: string,
    application: ApplicationPayload,
  ): Promise<RetryResult<SubmissionResult>> {
    return withRetry(
      () => this.doSubmitApplication(jobId, application),
      this.retryConfig,
      this.logger,
    );
  }

  private async doSubmitApplication(
    jobId: string,
    application: ApplicationPayload,
  ): Promise<SubmissionResult> {
    const formData = new FormData();
    formData.append(
      'resume',
      new Blob([new Uint8Array(application.resumeFile)], { type: 'application/pdf' }),
      'resume.pdf',
    );
    formData.append('firstName', application.applicantInfo.firstName);
    formData.append('lastName', application.applicantInfo.lastName);
    formData.append('email', application.applicantInfo.email);
    formData.append('phone', application.applicantInfo.phone);
    if (application.coverLetter) {
      formData.append('coverLetter', application.coverLetter);
    }

    const url = `${this.baseUrl}/jobs/${jobId}/apply`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      confirmationId: data.confirmationId || data.id,
    };
  }

  private mapJabinjaResponse(data: any): JabinjaJob[] {
    const jobs = Array.isArray(data) ? data : data.jobs || data.results || [];

    return jobs.map((job: any) => ({
      id: job.id || job._id,
      title: job.title || job.jobTitle,
      company: job.company || job.companyName,
      location: job.location || job.city,
      description: job.description || job.jobDescription || '',
      requirements: this.parseRequirements(job.requirements),
      category: job.category || job.jobCategory || 'general',
      experienceLevel: this.mapExperienceLevel(job.experienceLevel || job.level),
      postedAt: new Date(job.postedAt || job.createdAt || job.publishedDate),
      applicationUrl: job.applicationUrl || job.applyUrl || `${this.baseUrl}/jobs/${job.id}/apply`,
    }));
  }

  private parseRequirements(requirements: any): string[] {
    if (Array.isArray(requirements)) {
      return requirements.map((r) => (typeof r === 'string' ? r : r.text || r.description));
    }
    if (typeof requirements === 'string') {
      return requirements.split(/[,;\n]/).map((r) => r.trim()).filter(Boolean);
    }
    return [];
  }

  private mapExperienceLevel(level: string): ExperienceLevel {
    const levelMap: Record<string, ExperienceLevel> = {
      entry: ExperienceLevel.ENTRY,
      junior: ExperienceLevel.ENTRY,
      mid: ExperienceLevel.MID,
      middle: ExperienceLevel.MID,
      intermediate: ExperienceLevel.MID,
      senior: ExperienceLevel.SENIOR,
      lead: ExperienceLevel.LEAD,
      principal: ExperienceLevel.LEAD,
      staff: ExperienceLevel.LEAD,
    };

    const normalizedLevel = (level || '').toLowerCase().trim();
    return levelMap[normalizedLevel] || ExperienceLevel.MID;
  }
}
