import PDFDocument from 'pdfkit';
import { IUserProfile, IWorkExperience, IEducation, ISkill } from '@app/shared/interfaces/profile.interface';
import { ISectionSelection } from '@app/shared/interfaces/resume.interface';

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  style: 'modern' | 'classic' | 'minimal';
}

export interface TemplateColors {
  primary: string;
  secondary: string;
  text: string;
  accent: string;
  background: string;
}

export interface TemplateFonts {
  heading: string;
  body: string;
}

export abstract class BaseTemplate {
  protected doc: PDFKit.PDFDocument;
  protected colors: TemplateColors;
  protected fonts: TemplateFonts;
  protected margin = 50;
  protected pageWidth = 612; // Letter size
  protected pageHeight = 792;
  protected contentWidth: number;

  abstract readonly config: TemplateConfig;

  constructor() {
    this.doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: this.margin, bottom: this.margin, left: this.margin, right: this.margin },
    });
    this.contentWidth = this.pageWidth - 2 * this.margin;
    this.colors = this.getDefaultColors();
    this.fonts = this.getDefaultFonts();
  }

  protected abstract getDefaultColors(): TemplateColors;
  protected abstract getDefaultFonts(): TemplateFonts;

  abstract generate(
    profile: IUserProfile,
    sections: ISectionSelection,
    selectedExperiences?: string[],
    selectedEducation?: string[],
    selectedSkills?: string[],
  ): Promise<Buffer>;

  protected async toBuffer(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      this.doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      this.doc.on('end', () => resolve(Buffer.concat(chunks)));
      this.doc.on('error', reject);
      this.doc.end();
    });
  }

  protected formatDate(date: Date | undefined): string {
    if (!date) return 'Present';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  protected formatDateRange(startDate: Date, endDate?: Date, current?: boolean): string {
    const start = this.formatDate(startDate);
    const end = current ? 'Present' : this.formatDate(endDate);
    return `${start} - ${end}`;
  }

  protected filterExperiences(
    experiences: IWorkExperience[],
    selectedIds?: string[],
  ): IWorkExperience[] {
    if (!selectedIds || selectedIds.length === 0) return experiences;
    return experiences.filter((exp) => selectedIds.includes(exp.id));
  }

  protected filterEducation(education: IEducation[], selectedIds?: string[]): IEducation[] {
    if (!selectedIds || selectedIds.length === 0) return education;
    return education.filter((edu) => selectedIds.includes(edu.id));
  }

  protected filterSkills(skills: ISkill[], selectedIds?: string[]): ISkill[] {
    if (!selectedIds || selectedIds.length === 0) return skills;
    return skills.filter((skill) => selectedIds.includes(skill.id));
  }

  protected checkPageBreak(requiredSpace: number): void {
    if (this.doc.y + requiredSpace > this.pageHeight - this.margin) {
      this.doc.addPage();
    }
  }
}
