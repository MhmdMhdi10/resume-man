import { BaseTemplate, TemplateConfig, TemplateColors, TemplateFonts } from './base.template';
import { IUserProfile } from '@app/shared/interfaces/profile.interface';
import { ISectionSelection } from '@app/shared/interfaces/resume.interface';

export class ModernTemplate extends BaseTemplate {
  readonly config: TemplateConfig = {
    id: 'modern',
    name: 'Modern',
    description: 'A clean, contemporary design with accent colors and clear section dividers',
    style: 'modern',
  };

  protected getDefaultColors(): TemplateColors {
    return {
      primary: '#2563eb',
      secondary: '#64748b',
      text: '#1e293b',
      accent: '#3b82f6',
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

    // Name with accent color
    this.doc
      .font(this.fonts.heading)
      .fontSize(28)
      .fillColor(this.colors.primary)
      .text(fullName, this.margin, this.margin);

    // Contact info line
    const contactParts: string[] = [];
    if (personalInfo.email) contactParts.push(personalInfo.email);
    if (personalInfo.phone) contactParts.push(personalInfo.phone);
    if (personalInfo.address?.city) {
      const location = [personalInfo.address.city, personalInfo.address.country]
        .filter(Boolean)
        .join(', ');
      contactParts.push(location);
    }

    this.doc
      .font(this.fonts.body)
      .fontSize(10)
      .fillColor(this.colors.secondary)
      .text(contactParts.join(' | '), { align: 'left' });

    // Links line
    const links: string[] = [];
    if (personalInfo.linkedIn) links.push(personalInfo.linkedIn);
    if (personalInfo.website) links.push(personalInfo.website);

    if (links.length > 0) {
      this.doc.text(links.join(' | '), { align: 'left' });
    }

    this.doc.moveDown(1.5);
  }

  private renderSectionHeader(title: string): void {
    this.checkPageBreak(40);
    
    this.doc
      .font(this.fonts.heading)
      .fontSize(14)
      .fillColor(this.colors.primary)
      .text(title.toUpperCase());

    // Accent line under section header
    const y = this.doc.y + 2;
    this.doc
      .strokeColor(this.colors.accent)
      .lineWidth(2)
      .moveTo(this.margin, y)
      .lineTo(this.margin + this.contentWidth, y)
      .stroke();

    this.doc.moveDown(0.5);
  }

  private renderSummary(summary: string): void {
    this.renderSectionHeader('Professional Summary');
    
    this.doc
      .font(this.fonts.body)
      .fontSize(10)
      .fillColor(this.colors.text)
      .text(summary, { align: 'justify' });

    this.doc.moveDown(1);
  }


  private renderExperience(experiences: IUserProfile['workExperience']): void {
    this.renderSectionHeader('Work Experience');

    experiences.forEach((exp, index) => {
      this.checkPageBreak(80);

      // Role and company
      this.doc
        .font(this.fonts.heading)
        .fontSize(12)
        .fillColor(this.colors.text)
        .text(exp.role, { continued: true })
        .font(this.fonts.body)
        .fillColor(this.colors.secondary)
        .text(` at ${exp.company}`);

      // Date range
      this.doc
        .font(this.fonts.body)
        .fontSize(9)
        .fillColor(this.colors.secondary)
        .text(this.formatDateRange(exp.startDate, exp.endDate, exp.current));

      // Description
      if (exp.description) {
        this.doc
          .font(this.fonts.body)
          .fontSize(10)
          .fillColor(this.colors.text)
          .text(exp.description, { align: 'justify' });
      }

      // Achievements as bullet points
      if (exp.achievements && exp.achievements.length > 0) {
        this.doc.moveDown(0.3);
        exp.achievements.forEach((achievement) => {
          this.doc
            .font(this.fonts.body)
            .fontSize(10)
            .fillColor(this.colors.text)
            .text(`• ${achievement}`, { indent: 10 });
        });
      }

      if (index < experiences.length - 1) {
        this.doc.moveDown(0.8);
      }
    });

    this.doc.moveDown(1);
  }

  private renderEducation(education: IUserProfile['education']): void {
    this.renderSectionHeader('Education');

    education.forEach((edu, index) => {
      this.checkPageBreak(60);

      // Degree and field
      this.doc
        .font(this.fonts.heading)
        .fontSize(12)
        .fillColor(this.colors.text)
        .text(`${edu.degree} in ${edu.field}`);

      // Institution and dates
      this.doc
        .font(this.fonts.body)
        .fontSize(10)
        .fillColor(this.colors.secondary)
        .text(edu.institution, { continued: true })
        .text(` | ${this.formatDateRange(edu.startDate, edu.endDate)}`);

      // GPA if available
      if (edu.gpa) {
        this.doc
          .font(this.fonts.body)
          .fontSize(9)
          .fillColor(this.colors.secondary)
          .text(`GPA: ${edu.gpa.toFixed(2)}`);
      }

      // Achievements
      if (edu.achievements && edu.achievements.length > 0) {
        edu.achievements.forEach((achievement) => {
          this.doc
            .font(this.fonts.body)
            .fontSize(10)
            .fillColor(this.colors.text)
            .text(`• ${achievement}`, { indent: 10 });
        });
      }

      if (index < education.length - 1) {
        this.doc.moveDown(0.6);
      }
    });

    this.doc.moveDown(1);
  }

  private renderSkills(skills: IUserProfile['skills']): void {
    this.renderSectionHeader('Skills');

    // Group skills by category
    const skillsByCategory = skills.reduce(
      (acc, skill) => {
        const category = skill.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(skill);
        return acc;
      },
      {} as Record<string, typeof skills>,
    );

    Object.entries(skillsByCategory).forEach(([category, categorySkills]) => {
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      const skillNames = categorySkills.map((s) => s.name).join(', ');

      this.doc
        .font(this.fonts.heading)
        .fontSize(10)
        .fillColor(this.colors.text)
        .text(`${categoryName}: `, { continued: true })
        .font(this.fonts.body)
        .fillColor(this.colors.secondary)
        .text(skillNames);
    });
  }
}
