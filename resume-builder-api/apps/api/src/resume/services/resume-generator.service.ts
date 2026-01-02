import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { IUserProfile } from '@app/shared/interfaces/profile.interface';
import { IResumeOptions, IGeneratedResume, ISectionSelection } from '@app/shared/interfaces/resume.interface';
import { TemplateRegistry } from '../templates/template.registry';

@Injectable()
export class ResumeGeneratorService {
  private readonly logger = new Logger(ResumeGeneratorService.name);

  constructor(private readonly templateRegistry: TemplateRegistry) {}

  async generate(profile: IUserProfile, options: IResumeOptions): Promise<IGeneratedResume> {
    this.logger.log(`Generating resume for user ${profile.userId} with template ${options.templateId}`);

    // Validate template exists
    if (!this.templateRegistry.hasTemplate(options.templateId)) {
      throw new BadRequestException(`Template not found: ${options.templateId}`);
    }

    // Validate profile has required data
    this.validateProfile(profile, options.includeSections);

    // Get template instance
    const template = this.templateRegistry.getTemplate(options.templateId);

    // Generate PDF
    const pdfBuffer = await template.generate(
      profile,
      options.includeSections,
      options.selectedExperiences,
      options.selectedEducation,
      options.selectedSkills,
    );

    // Determine which sections were actually included
    const sectionsIncluded = this.getSectionsIncluded(options.includeSections);

    this.logger.log(`Resume generated successfully, size: ${pdfBuffer.length} bytes`);

    return {
      pdfBuffer,
      templateUsed: options.templateId,
      sectionsIncluded,
      generatedAt: new Date(),
    };
  }

  private validateProfile(profile: IUserProfile, sections: ISectionSelection): void {
    if (sections.personalInfo && !profile.personalInfo) {
      throw new BadRequestException('Profile personal info is required');
    }

    if (sections.workExperience && (!profile.workExperience || profile.workExperience.length === 0)) {
      this.logger.warn('Work experience section selected but no experiences found');
    }

    if (sections.education && (!profile.education || profile.education.length === 0)) {
      this.logger.warn('Education section selected but no education entries found');
    }

    if (sections.skills && (!profile.skills || profile.skills.length === 0)) {
      this.logger.warn('Skills section selected but no skills found');
    }
  }

  private getSectionsIncluded(sections: ISectionSelection): string[] {
    const included: string[] = [];
    if (sections.personalInfo) included.push('personalInfo');
    if (sections.summary) included.push('summary');
    if (sections.workExperience) included.push('workExperience');
    if (sections.education) included.push('education');
    if (sections.skills) included.push('skills');
    return included;
  }

  getAvailableTemplates() {
    return this.templateRegistry.getAvailableTemplates();
  }

  getDefaultTemplateId(): string {
    return this.templateRegistry.getDefaultTemplateId();
  }
}
