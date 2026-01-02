import { BaseTemplate, TemplateConfig, TemplateColors, TemplateFonts } from './base.template';
import { IUserProfile } from '@app/shared/interfaces/profile.interface';
import { ISectionSelection } from '@app/shared/interfaces/resume.interface';

export class ClassicTemplate extends BaseTemplate {
  readonly config: TemplateConfig = {
    id: 'classic',
    name: 'Classic',
    description: 'A traditional, professional layout suitable for conservative industries',
    style: 'classic',
  };

  protected getDefaultColors(): TemplateColors {
    return {
      primary: '#000000',
      secondary: '#4a4a4a',
      text: '#000000',
      accent: '#000000',
      background: '#ffffff',
    };
  }

  protected getDefaultFonts(): TemplateFonts {
    return {
      heading: 'Times-Bold',
      body: 'Times-Roman',
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

    // Centered name
    this.doc
      .font(this.fonts.heading)
      .fontSize(24)
      .fillColor(this.colors.primary)
      .text(fullName, { align: 'center' });

    // Horizontal line
    const y = this.doc.y + 5;
    this.doc
      .strokeColor(this.colors.primary)
      .lineWidth(1)
      .moveTo(this.margin, y)
      .lineTo(this.margin + this.contentWidth, y)
      .stroke();

    this.doc.moveDown(0.5);

    // Contact info centered
    const contactParts: string[] = [];
    if (personalInfo.address?.city) {
      const location = [personalInfo.address.city, personalInfo.address.state, personalInfo.address.country]
        .filter(Boolean)
        .join(', ');
      contactParts.push(location);
    }
    if (personalInfo.phone) contactParts.push(personalInfo.phone);
    if (personalInfo.email) contactParts.push(personalInfo.email);

    this.doc
      .font(this.fonts.body)
      .fontSize(10)
      .fillColor(this.colors.secondary)
      .text(contactParts.join(' • '), { align: 'center' });

    if (personalInfo.linkedIn || personalInfo.website) {
      const links = [personalInfo.linkedIn, personalInfo.website].filter(Boolean).join(' • ');
      this.doc.text(links, { align: 'center' });
    }

    this.doc.moveDown(1.5);
  }


  private renderSectionHeader(title: string): void {
    this.checkPageBreak(40);

    this.doc
      .font(this.fonts.heading)
      .fontSize(12)
      .fillColor(this.colors.primary)
      .text(title.toUpperCase(), { align: 'center' });

    // Double line under section header
    const y = this.doc.y + 3;
    this.doc
      .strokeColor(this.colors.primary)
      .lineWidth(0.5)
      .moveTo(this.margin + 100, y)
      .lineTo(this.margin + this.contentWidth - 100, y)
      .stroke();

    this.doc.moveDown(0.8);
  }

  private renderSummary(summary: string): void {
    this.renderSectionHeader('Professional Summary');

    this.doc
      .font(this.fonts.body)
      .fontSize(11)
      .fillColor(this.colors.text)
      .text(summary, { align: 'justify' });

    this.doc.moveDown(1);
  }

  private renderExperience(experiences: IUserProfile['workExperience']): void {
    this.renderSectionHeader('Professional Experience');

    experiences.forEach((exp, index) => {
      this.checkPageBreak(80);

      // Company and dates on same line
      this.doc
        .font(this.fonts.heading)
        .fontSize(11)
        .fillColor(this.colors.primary)
        .text(exp.company, { continued: true })
        .font(this.fonts.body)
        .fontSize(10)
        .fillColor(this.colors.secondary)
        .text(`  ${this.formatDateRange(exp.startDate, exp.endDate, exp.current)}`, { align: 'right' });

      // Role
      this.doc
        .font(this.fonts.body)
        .fontSize(11)
        .fillColor(this.colors.text)
        .text(exp.role, { oblique: true });

      // Description
      if (exp.description) {
        this.doc.moveDown(0.3);
        this.doc
          .font(this.fonts.body)
          .fontSize(10)
          .fillColor(this.colors.text)
          .text(exp.description, { align: 'justify' });
      }

      // Achievements
      if (exp.achievements && exp.achievements.length > 0) {
        this.doc.moveDown(0.3);
        exp.achievements.forEach((achievement) => {
          this.doc
            .font(this.fonts.body)
            .fontSize(10)
            .fillColor(this.colors.text)
            .text(`- ${achievement}`, { indent: 15 });
        });
      }

      if (index < experiences.length - 1) {
        this.doc.moveDown(1);
      }
    });

    this.doc.moveDown(1);
  }

  private renderEducation(education: IUserProfile['education']): void {
    this.renderSectionHeader('Education');

    education.forEach((edu, index) => {
      this.checkPageBreak(60);

      // Institution and dates
      this.doc
        .font(this.fonts.heading)
        .fontSize(11)
        .fillColor(this.colors.primary)
        .text(edu.institution, { continued: true })
        .font(this.fonts.body)
        .fontSize(10)
        .fillColor(this.colors.secondary)
        .text(`  ${this.formatDateRange(edu.startDate, edu.endDate)}`, { align: 'right' });

      // Degree
      this.doc
        .font(this.fonts.body)
        .fontSize(11)
        .fillColor(this.colors.text)
        .text(`${edu.degree} in ${edu.field}`);

      // GPA
      if (edu.gpa) {
        this.doc
          .font(this.fonts.body)
          .fontSize(10)
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
            .text(`- ${achievement}`, { indent: 15 });
        });
      }

      if (index < education.length - 1) {
        this.doc.moveDown(0.8);
      }
    });

    this.doc.moveDown(1);
  }

  private renderSkills(skills: IUserProfile['skills']): void {
    this.renderSectionHeader('Skills');

    // Group by category
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
        .fillColor(this.colors.primary)
        .text(`${categoryName}: `, { continued: true })
        .font(this.fonts.body)
        .fillColor(this.colors.text)
        .text(skillNames);
    });
  }
}
