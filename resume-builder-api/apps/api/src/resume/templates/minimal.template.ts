import { BaseTemplate, TemplateConfig, TemplateColors, TemplateFonts } from './base.template';
import { IUserProfile } from '@app/shared/interfaces/profile.interface';
import { ISectionSelection } from '@app/shared/interfaces/resume.interface';

export class MinimalTemplate extends BaseTemplate {
  readonly config: TemplateConfig = {
    id: 'minimal',
    name: 'Minimal',
    description: 'A simple, clean design focusing on content with minimal styling',
    style: 'minimal',
  };

  protected getDefaultColors(): TemplateColors {
    return {
      primary: '#333333',
      secondary: '#666666',
      text: '#333333',
      accent: '#999999',
      background: '#ffffff',
    };
  }

  protected getDefaultFonts(): TemplateFonts {
    return {
      heading: 'Helvetica-Bold',
      body: 'Helvetica',
    };
  }

  async generate(
    profile: IUserProfile,
    sections: ISectionSelection,
    selectedExperiences?: string[],
    selectedEducation?: string[],
    selectedSkills?: string[],
  ): Promise<Buffer> {
    if (sections.personalInfo) {
      this.renderHeader(profile);
    }

    if (sections.summary && profile.personalInfo.summary) {
      this.renderSummary(profile.personalInfo.summary);
    }

    if (sections.workExperience && profile.workExperience.length > 0) {
      const experiences = this.filterExperiences(profile.workExperience, selectedExperiences);
      if (experiences.length > 0) {
        this.renderExperience(experiences);
      }
    }

    if (sections.education && profile.education.length > 0) {
      const education = this.filterEducation(profile.education, selectedEducation);
      if (education.length > 0) {
        this.renderEducation(education);
      }
    }

    if (sections.skills && profile.skills.length > 0) {
      const skills = this.filterSkills(profile.skills, selectedSkills);
      if (skills.length > 0) {
        this.renderSkills(skills);
      }
    }

    return this.toBuffer();
  }

  private renderHeader(profile: IUserProfile): void {
    const { personalInfo } = profile;
    const fullName = `${personalInfo.firstName} ${personalInfo.lastName}`;

    // Simple name
    this.doc
      .font(this.fonts.heading)
      .fontSize(20)
      .fillColor(this.colors.primary)
      .text(fullName);

    this.doc.moveDown(0.3);

    // Contact on one line
    const contactParts: string[] = [];
    if (personalInfo.email) contactParts.push(personalInfo.email);
    if (personalInfo.phone) contactParts.push(personalInfo.phone);
    if (personalInfo.address?.city) {
      contactParts.push(`${personalInfo.address.city}, ${personalInfo.address.country}`);
    }
    if (personalInfo.linkedIn) contactParts.push(personalInfo.linkedIn);
    if (personalInfo.website) contactParts.push(personalInfo.website);

    this.doc
      .font(this.fonts.body)
      .fontSize(9)
      .fillColor(this.colors.secondary)
      .text(contactParts.join(' | '));

    this.doc.moveDown(1.5);
  }

  private renderSectionHeader(title: string): void {
    this.checkPageBreak(30);

    this.doc
      .font(this.fonts.heading)
      .fontSize(11)
      .fillColor(this.colors.primary)
      .text(title);

    this.doc.moveDown(0.5);
  }

  private renderSummary(summary: string): void {
    this.renderSectionHeader('Summary');

    this.doc
      .font(this.fonts.body)
      .fontSize(10)
      .fillColor(this.colors.text)
      .text(summary);

    this.doc.moveDown(1);
  }


  private renderExperience(experiences: IUserProfile['workExperience']): void {
    this.renderSectionHeader('Experience');

    experiences.forEach((exp, index) => {
      this.checkPageBreak(60);

      // Role at Company | Dates
      this.doc
        .font(this.fonts.heading)
        .fontSize(10)
        .fillColor(this.colors.primary)
        .text(`${exp.role} at ${exp.company}`, { continued: true })
        .font(this.fonts.body)
        .fontSize(9)
        .fillColor(this.colors.accent)
        .text(` | ${this.formatDateRange(exp.startDate, exp.endDate, exp.current)}`);

      // Description
      if (exp.description) {
        this.doc
          .font(this.fonts.body)
          .fontSize(9)
          .fillColor(this.colors.text)
          .text(exp.description);
      }

      // Achievements as simple list
      if (exp.achievements && exp.achievements.length > 0) {
        exp.achievements.forEach((achievement) => {
          this.doc
            .font(this.fonts.body)
            .fontSize(9)
            .fillColor(this.colors.secondary)
            .text(`• ${achievement}`);
        });
      }

      if (index < experiences.length - 1) {
        this.doc.moveDown(0.6);
      }
    });

    this.doc.moveDown(1);
  }

  private renderEducation(education: IUserProfile['education']): void {
    this.renderSectionHeader('Education');

    education.forEach((edu, index) => {
      this.checkPageBreak(40);

      // Degree | Institution | Dates
      this.doc
        .font(this.fonts.heading)
        .fontSize(10)
        .fillColor(this.colors.primary)
        .text(`${edu.degree} in ${edu.field}`, { continued: true })
        .font(this.fonts.body)
        .fontSize(9)
        .fillColor(this.colors.secondary)
        .text(` | ${edu.institution} | ${this.formatDateRange(edu.startDate, edu.endDate)}`);

      if (edu.gpa) {
        this.doc
          .font(this.fonts.body)
          .fontSize(9)
          .fillColor(this.colors.accent)
          .text(`GPA: ${edu.gpa.toFixed(2)}`);
      }

      if (index < education.length - 1) {
        this.doc.moveDown(0.4);
      }
    });

    this.doc.moveDown(1);
  }

  private renderSkills(skills: IUserProfile['skills']): void {
    this.renderSectionHeader('Skills');

    // Simple comma-separated list
    const skillNames = skills.map((s) => s.name).join(', ');

    this.doc
      .font(this.fonts.body)
      .fontSize(9)
      .fillColor(this.colors.text)
      .text(skillNames);
  }
}
