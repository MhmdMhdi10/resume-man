import { Test, TestingModule } from '@nestjs/testing';
import { ResumeGeneratorService } from '../services/resume-generator.service';
import { TemplateRegistry } from '../templates/template.registry';
import { IUserProfile } from '@app/shared/interfaces/profile.interface';
import { ISectionSelection } from '@app/shared/interfaces/resume.interface';
import { SkillCategory, ProficiencyLevel } from '@app/shared/enums';

describe('ResumeGeneratorService', () => {
  let module: TestingModule;
  let resumeGenerator: ResumeGeneratorService;

  const mockProfile: IUserProfile = {
    id: '507f1f77bcf86cd799439011',
    userId: '507f1f77bcf86cd799439012',
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567',
      address: {
        city: 'New York',
        country: 'USA',
      },
      summary: 'Experienced software developer with 10 years of experience.',
    },
    workExperience: [
      {
        id: '507f1f77bcf86cd799439013',
        company: 'Tech Corp',
        role: 'Senior Developer',
        startDate: new Date('2020-01-01'),
        current: true,
        description: 'Leading development team',
        achievements: ['Increased performance by 50%'],
      },
    ],
    education: [
      {
        id: '507f1f77bcf86cd799439014',
        institution: 'MIT',
        degree: 'Bachelor',
        field: 'Computer Science',
        startDate: new Date('2010-09-01'),
        endDate: new Date('2014-06-01'),
        gpa: 3.8,
        achievements: ['Magna Cum Laude'],
      },
    ],
    skills: [
      {
        id: '507f1f77bcf86cd799439015',
        name: 'TypeScript',
        category: SkillCategory.TECHNICAL,
        proficiencyLevel: ProficiencyLevel.EXPERT,
      },
    ],
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        ResumeGeneratorService,
        TemplateRegistry,
      ],
    }).compile();

    resumeGenerator = module.get<ResumeGeneratorService>(ResumeGeneratorService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should generate a valid PDF', async () => {
    const sections: ISectionSelection = {
      personalInfo: true,
      summary: true,
      workExperience: true,
      education: true,
      skills: true,
    };

    const result = await resumeGenerator.generate(mockProfile, {
      templateId: 'modern',
      includeSections: sections,
    });

    expect(result.pdfBuffer).toBeDefined();
    expect(result.pdfBuffer.length).toBeGreaterThan(0);
    expect(result.pdfBuffer.slice(0, 5).toString()).toBe('%PDF-');
  });

  it('should track sections correctly', async () => {
    const sections: ISectionSelection = {
      personalInfo: true,
      summary: false,
      workExperience: true,
      education: false,
      skills: true,
    };

    const result = await resumeGenerator.generate(mockProfile, {
      templateId: 'classic',
      includeSections: sections,
    });

    expect(result.sectionsIncluded).toContain('personalInfo');
    expect(result.sectionsIncluded).toContain('workExperience');
    expect(result.sectionsIncluded).toContain('skills');
    expect(result.sectionsIncluded).not.toContain('summary');
    expect(result.sectionsIncluded).not.toContain('education');
  });

  it('should record template used', async () => {
    const sections: ISectionSelection = {
      personalInfo: true,
      summary: false,
      workExperience: false,
      education: false,
      skills: false,
    };

    const result = await resumeGenerator.generate(mockProfile, {
      templateId: 'minimal',
      includeSections: sections,
    });

    expect(result.templateUsed).toBe('minimal');
  });
});
