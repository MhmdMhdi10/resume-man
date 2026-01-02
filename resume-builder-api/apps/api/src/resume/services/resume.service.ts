import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { IUserProfile } from '@app/shared/interfaces/profile.interface';
import { IResumeOptions, IGeneratedResume, ISavedResume, IResumeTemplate } from '@app/shared/interfaces/resume.interface';
import { ResumeRepository, PaginatedResult } from '../repositories/resume.repository';
import { StorageService } from './storage.service';
import { ResumeGeneratorService } from './resume-generator.service';
import { ResumeDocument } from '../schemas/resume.schema';

export interface GenerateAndSaveOptions {
  userId: string;
  profile: IUserProfile;
  options: IResumeOptions;
  name: string;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
}

@Injectable()
export class ResumeService {
  private readonly logger = new Logger(ResumeService.name);

  constructor(
    private readonly resumeRepository: ResumeRepository,
    private readonly storageService: StorageService,
    private readonly resumeGenerator: ResumeGeneratorService,
  ) {}

  async generateResume(profile: IUserProfile, options: IResumeOptions): Promise<IGeneratedResume> {
    return this.resumeGenerator.generate(profile, options);
  }

  async generateAndSave(params: GenerateAndSaveOptions): Promise<ISavedResume> {
    const { userId, profile, options, name } = params;

    this.logger.log(`Generating and saving resume for user ${userId}`);

    // Generate the PDF
    const generated = await this.resumeGenerator.generate(profile, options);

    // Generate storage key
    const storageKey = this.storageService.generateKey(userId, `${name}.pdf`);

    // Upload to storage
    const uploadResult = await this.storageService.uploadFile(
      generated.pdfBuffer,
      storageKey,
      'application/pdf',
    );

    // Save metadata to database
    const resume = await this.resumeRepository.create({
      userId,
      name,
      templateId: generated.templateUsed,
      storageKey,
      sectionsIncluded: generated.sectionsIncluded,
      fileSize: uploadResult.size,
      mimeType: 'application/pdf',
    });

    this.logger.log(`Resume saved with id ${resume._id}`);

    return this.mapToSavedResume(resume);
  }

  async saveResume(
    userId: string,
    generated: IGeneratedResume,
    name: string,
  ): Promise<ISavedResume> {
    // Generate storage key
    const storageKey = this.storageService.generateKey(userId, `${name}.pdf`);

    // Upload to storage
    const uploadResult = await this.storageService.uploadFile(
      generated.pdfBuffer,
      storageKey,
      'application/pdf',
    );

    // Save metadata to database
    const resume = await this.resumeRepository.create({
      userId,
      name,
      templateId: generated.templateUsed,
      storageKey,
      sectionsIncluded: generated.sectionsIncluded,
      fileSize: uploadResult.size,
      mimeType: 'application/pdf',
    });

    return this.mapToSavedResume(resume);
  }

  async getResumes(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<ISavedResume>> {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;

    const result = await this.resumeRepository.findByUserId(userId, { page, limit });

    return {
      items: result.items.map((r) => this.mapToSavedResume(r)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  async getResume(userId: string, resumeId: string): Promise<ISavedResume> {
    const resume = await this.resumeRepository.findByIdAndUserId(resumeId, userId);
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }
    return this.mapToSavedResume(resume);
  }

  async getResumeFile(userId: string, resumeId: string): Promise<Buffer> {
    const resume = await this.resumeRepository.findByIdAndUserId(resumeId, userId);
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    try {
      return await this.storageService.getFile(resume.storageKey);
    } catch (error) {
      this.logger.error(`Failed to retrieve file for resume ${resumeId}:`, error);
      throw new NotFoundException('Resume file not found');
    }
  }

  async deleteResume(userId: string, resumeId: string): Promise<void> {
    const resume = await this.resumeRepository.findByIdAndUserId(resumeId, userId);
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Delete from storage
    const storageDeleted = await this.storageService.deleteFile(resume.storageKey);
    if (!storageDeleted) {
      this.logger.warn(`Failed to delete storage file for resume ${resumeId}`);
    }

    // Delete from database
    await this.resumeRepository.delete(resumeId, userId);

    this.logger.log(`Resume ${resumeId} deleted for user ${userId}`);
  }

  async deleteAllResumes(userId: string): Promise<number> {
    // Get all resumes for user
    const result = await this.resumeRepository.findByUserId(userId, { page: 1, limit: 1000 });

    // Delete all files from storage
    for (const resume of result.items) {
      await this.storageService.deleteFile(resume.storageKey);
    }

    // Delete all from database
    return this.resumeRepository.deleteAllByUserId(userId);
  }

  async resumeExists(userId: string, resumeId: string): Promise<boolean> {
    const resume = await this.resumeRepository.findByIdAndUserId(resumeId, userId);
    return resume !== null;
  }

  async fileExists(userId: string, resumeId: string): Promise<boolean> {
    const resume = await this.resumeRepository.findByIdAndUserId(resumeId, userId);
    if (!resume) {
      return false;
    }
    return this.storageService.fileExists(resume.storageKey);
  }

  getTemplates(): IResumeTemplate[] {
    return this.resumeGenerator.getAvailableTemplates();
  }

  private mapToSavedResume(resume: ResumeDocument): ISavedResume {
    return {
      id: resume._id.toString(),
      userId: resume.userId.toString(),
      name: resume.name,
      templateId: resume.templateId,
      storageUrl: this.storageService.getFileUrl(resume.storageKey),
      sectionsIncluded: resume.sectionsIncluded,
      createdAt: resume.createdAt,
    };
  }
}
