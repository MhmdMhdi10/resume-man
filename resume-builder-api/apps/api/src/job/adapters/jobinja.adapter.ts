import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExperienceLevel } from '@app/shared';
import { withRetry, RetryConfig, RetryResult } from '../utils/retry.util';
import { CircuitBreaker, CircuitBreakerConfig } from '../utils/circuit-breaker.util';

export interface JobinjaSearchParams {
  query?: string;
  location?: string;
  category?: string;
  page: number;
}

export interface JobinjaJob {
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

export interface JobinjaLoginResult {
  success: boolean;
  sessionCookie?: string;
  errorMessage?: string;
}

@Injectable()
export class JobinjaAdapter {
  private readonly logger = new Logger(JobinjaAdapter.name);
  private readonly baseUrl = 'https://jobinja.ir';
  private readonly retryConfig: RetryConfig;
  private readonly circuitBreaker: CircuitBreaker<JobinjaJob[]>;
  private readonly submissionCircuitBreaker: CircuitBreaker<SubmissionResult>;
  private cachedJobs: JobinjaJob[] = [];

  constructor(private readonly configService: ConfigService) {
    this.retryConfig = {
      maxRetries: this.configService.get<number>('JOBINJA_MAX_RETRIES', 3),
      baseDelayMs: this.configService.get<number>('JOBINJA_BASE_DELAY_MS', 1000),
      maxDelayMs: this.configService.get<number>('JOBINJA_MAX_DELAY_MS', 30000),
      jitterFactor: 0.1,
    };

    const circuitBreakerConfig: Partial<CircuitBreakerConfig> = {
      failureThreshold: this.configService.get<number>('JOBINJA_CB_FAILURE_THRESHOLD', 5),
      failureWindowMs: this.configService.get<number>('JOBINJA_CB_FAILURE_WINDOW_MS', 60000),
      openDurationMs: this.configService.get<number>('JOBINJA_CB_OPEN_DURATION_MS', 30000),
    };

    this.circuitBreaker = new CircuitBreaker<JobinjaJob[]>(
      'jobinja-jobs',
      circuitBreakerConfig,
      () => this.getFallbackJobs(),
    );

    this.submissionCircuitBreaker = new CircuitBreaker<SubmissionResult>(
      'jobinja-submission',
      circuitBreakerConfig,
    );
  }

  private async getFallbackJobs(): Promise<JobinjaJob[]> {
    this.logger.warn('Using cached jobs as fallback');
    return this.cachedJobs;
  }

  setCachedJobs(jobs: JobinjaJob[]): void {
    this.cachedJobs = jobs;
  }

  async fetchJobs(params: JobinjaSearchParams): Promise<JobinjaJob[]> {
    this.logger.debug(`Fetching jobs with params: ${JSON.stringify(params)}`);

    const jobs = await this.circuitBreaker.execute(async () => {
      const result = await this.fetchJobsWithRetry(params);
      
      if (!result.success) {
        this.logger.error(`Failed to fetch jobs after ${result.attempts} attempts`);
        throw result.error;
      }

      return result.data!;
    });

    if (jobs.length > 0) {
      this.cachedJobs = jobs;
    }

    return jobs;
  }

  async fetchJobsWithRetry(params: JobinjaSearchParams): Promise<RetryResult<JobinjaJob[]>> {
    return withRetry(
      () => this.doFetchJobs(params),
      this.retryConfig,
      this.logger,
    );
  }

  private async doFetchJobs(params: JobinjaSearchParams): Promise<JobinjaJob[]> {
    // Build the Jobinja search URL
    let url = `${this.baseUrl}/jobs`;
    const queryParts: string[] = [];
    
    if (params.query) {
      queryParts.push(`q=${encodeURIComponent(params.query)}`);
    }
    if (params.location) {
      queryParts.push(`location=${encodeURIComponent(params.location)}`);
    }
    if (params.category) {
      queryParts.push(`cat=${encodeURIComponent(params.category)}`);
    }
    if (params.page > 1) {
      queryParts.push(`page=${params.page}`);
    }
    
    if (queryParts.length > 0) {
      url += `?${queryParts.join('&')}`;
    }

    this.logger.debug(`Fetching from URL: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Jobinja fetch error: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    return this.parseJobListings(html);
  }

  private parseJobListings(html: string): JobinjaJob[] {
    const jobs: JobinjaJob[] = [];
    
    // Parse job cards from the HTML
    // Jobinja uses specific CSS classes for job listings
    const jobCardRegex = /<article[^>]*class="[^"]*c-jobListView__item[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    const matches = html.matchAll(jobCardRegex);

    for (const match of matches) {
      try {
        const cardHtml = match[1];
        const job = this.parseJobCard(cardHtml);
        if (job) {
          jobs.push(job);
        }
      } catch (error) {
        this.logger.warn('Failed to parse job card', error);
      }
    }

    // Alternative parsing if the above doesn't match
    if (jobs.length === 0) {
      const altJobRegex = /<a[^>]*href="(\/companies\/[^"]*\/jobs\/[^"]*)"[^>]*class="[^"]*c-jobListView__titleLink[^"]*"[^>]*>([^<]*)<\/a>/gi;
      const altMatches = html.matchAll(altJobRegex);
      
      for (const match of altMatches) {
        const jobUrl = match[1];
        const title = match[2].trim();
        const jobId = this.extractJobId(jobUrl);
        
        if (jobId && title) {
          jobs.push({
            id: jobId,
            title: title,
            company: this.extractCompanyFromUrl(jobUrl),
            location: 'ایران',
            description: '',
            requirements: [],
            category: 'general',
            experienceLevel: ExperienceLevel.MID,
            postedAt: new Date(),
            applicationUrl: `${this.baseUrl}${jobUrl}`,
          });
        }
      }
    }

    this.logger.debug(`Parsed ${jobs.length} jobs from HTML`);
    return jobs;
  }

  private parseJobCard(cardHtml: string): JobinjaJob | null {
    // Extract job URL and ID
    const urlMatch = cardHtml.match(/href="(\/companies\/[^"]*\/jobs\/[^"]*)"/);
    if (!urlMatch) return null;
    
    const jobUrl = urlMatch[1];
    const jobId = this.extractJobId(jobUrl);
    if (!jobId) return null;

    // Extract title
    const titleMatch = cardHtml.match(/c-jobListView__titleLink[^>]*>([^<]*)</);
    const title = titleMatch ? this.decodeHtmlEntities(titleMatch[1].trim()) : 'Unknown Position';

    // Extract company name
    const companyMatch = cardHtml.match(/c-jobListView__company[^>]*>([^<]*)</);
    const company = companyMatch ? this.decodeHtmlEntities(companyMatch[1].trim()) : this.extractCompanyFromUrl(jobUrl);

    // Extract location
    const locationMatch = cardHtml.match(/c-jobListView__location[^>]*>([^<]*)</);
    const location = locationMatch ? this.decodeHtmlEntities(locationMatch[1].trim()) : 'ایران';

    // Extract category
    const categoryMatch = cardHtml.match(/c-jobListView__category[^>]*>([^<]*)</);
    const category = categoryMatch ? this.decodeHtmlEntities(categoryMatch[1].trim()) : 'general';

    // Extract posted date
    const dateMatch = cardHtml.match(/c-jobListView__date[^>]*>([^<]*)</);
    const postedAt = dateMatch ? this.parseJobinjaDate(dateMatch[1].trim()) : new Date();

    return {
      id: jobId,
      title,
      company,
      location,
      description: '',
      requirements: [],
      category: this.mapCategory(category),
      experienceLevel: ExperienceLevel.MID,
      postedAt,
      applicationUrl: `${this.baseUrl}${jobUrl}`,
    };
  }

  private extractJobId(url: string): string | null {
    // URL format: /companies/{company}/jobs/{job-slug}
    const match = url.match(/\/jobs\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  private extractCompanyFromUrl(url: string): string {
    const match = url.match(/\/companies\/([^\/]+)/);
    if (match) {
      return match[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    return 'Unknown Company';
  }

  private decodeHtmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .trim();
  }

  private parseJobinjaDate(dateStr: string): Date {
    // Jobinja uses Persian date formats like "۲ روز پیش" (2 days ago)
    const now = new Date();
    
    if (dateStr.includes('امروز') || dateStr.includes('today')) {
      return now;
    }
    if (dateStr.includes('دیروز') || dateStr.includes('yesterday')) {
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    // Extract number of days/weeks/months
    const numMatch = dateStr.match(/(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (dateStr.includes('روز') || dateStr.includes('day')) {
        return new Date(now.getTime() - num * 24 * 60 * 60 * 1000);
      }
      if (dateStr.includes('هفته') || dateStr.includes('week')) {
        return new Date(now.getTime() - num * 7 * 24 * 60 * 60 * 1000);
      }
      if (dateStr.includes('ماه') || dateStr.includes('month')) {
        return new Date(now.getTime() - num * 30 * 24 * 60 * 60 * 1000);
      }
    }
    
    return now;
  }

  private mapCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'فناوری اطلاعات': 'engineering',
      'برنامه‌نویسی': 'engineering',
      'طراحی': 'design',
      'بازاریابی': 'marketing',
      'فروش': 'sales',
      'مالی': 'finance',
      'منابع انسانی': 'hr',
      'اداری': 'operations',
    };
    
    for (const [key, value] of Object.entries(categoryMap)) {
      if (category.includes(key)) {
        return value;
      }
    }
    return 'other';
  }

  async loginToJobinja(email: string, password: string): Promise<JobinjaLoginResult> {
    try {
      // First, get the login page to extract CSRF token
      const loginPageResponse = await fetch(`${this.baseUrl}/login/user`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!loginPageResponse.ok) {
        return { success: false, errorMessage: 'Failed to load login page' };
      }

      const cookies = loginPageResponse.headers.get('set-cookie') || '';
      const html = await loginPageResponse.text();
      
      // Extract CSRF token if present
      const csrfMatch = html.match(/name="_token"\s+value="([^"]+)"/);
      const csrfToken = csrfMatch ? csrfMatch[1] : '';

      // Perform login
      const formData = new URLSearchParams();
      formData.append('identifier', email);
      formData.append('password', password);
      formData.append('remember_me', '1');
      if (csrfToken) {
        formData.append('_token', csrfToken);
      }

      const loginResponse = await fetch(`${this.baseUrl}/login/user`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies,
          'Referer': `${this.baseUrl}/login/user`,
        },
        body: formData.toString(),
        redirect: 'manual',
      });

      // Check if login was successful (usually redirects on success)
      const responseCookies = loginResponse.headers.get('set-cookie') || '';
      
      if (loginResponse.status === 302 || responseCookies.includes('jobinja_session')) {
        return {
          success: true,
          sessionCookie: responseCookies,
        };
      }

      return {
        success: false,
        errorMessage: 'Invalid credentials or login failed',
      };
    } catch (error) {
      this.logger.error('Login to Jobinja failed', error);
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async submitApplication(
    jobId: string,
    application: ApplicationPayload,
    sessionCookie?: string,
  ): Promise<SubmissionResult> {
    this.logger.debug(`Submitting application for job: ${jobId}`);

    if (!sessionCookie) {
      return {
        success: false,
        errorMessage: 'Not logged in to Jobinja. Please configure your Jobinja credentials in settings.',
      };
    }

    try {
      return await this.submissionCircuitBreaker.execute(async () => {
        const result = await this.submitApplicationWithRetry(jobId, application, sessionCookie);
        
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
    sessionCookie: string,
  ): Promise<RetryResult<SubmissionResult>> {
    return withRetry(
      () => this.doSubmitApplication(jobId, application, sessionCookie),
      this.retryConfig,
      this.logger,
    );
  }

  private async doSubmitApplication(
    jobId: string,
    application: ApplicationPayload,
    sessionCookie: string,
  ): Promise<SubmissionResult> {
    // Get the job application page first
    const jobPageResponse = await fetch(`${this.baseUrl}/jobs/${jobId}/apply`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': sessionCookie,
      },
    });

    if (!jobPageResponse.ok) {
      throw new Error(`Failed to load job application page: ${jobPageResponse.status}`);
    }

    const html = await jobPageResponse.text();
    const csrfMatch = html.match(/name="_token"\s+value="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : '';

    // Create form data for application
    const formData = new FormData();
    formData.append('resume', new Blob([application.resumeFile], { type: 'application/pdf' }), 'resume.pdf');
    if (application.coverLetter) {
      formData.append('cover_letter', application.coverLetter);
    }
    if (csrfToken) {
      formData.append('_token', csrfToken);
    }

    const submitResponse = await fetch(`${this.baseUrl}/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Cookie': sessionCookie,
      },
      body: formData,
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Application submission failed: ${submitResponse.status} - ${errorText.substring(0, 200)}`);
    }

    return {
      success: true,
      confirmationId: `jobinja-${jobId}-${Date.now()}`,
    };
  }
}
