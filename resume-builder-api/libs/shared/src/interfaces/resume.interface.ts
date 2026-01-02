export interface ISectionSelection {
  personalInfo: boolean;
  summary: boolean;
  workExperience: boolean;
  education: boolean;
  skills: boolean;
}

export interface IResumeOptions {
  templateId: string;
  includeSections: ISectionSelection;
  selectedExperiences?: string[];
  selectedEducation?: string[];
  selectedSkills?: string[];
}

export interface IGeneratedResume {
  pdfBuffer: Buffer;
  templateUsed: string;
  sectionsIncluded: string[];
  generatedAt: Date;
}

export interface ISavedResume {
  id: string;
  userId: string;
  name: string;
  templateId: string;
  storageUrl: string;
  sectionsIncluded: string[];
  createdAt: Date;
}

export interface IResumeTemplate {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  style: 'modern' | 'classic' | 'minimal';
}
