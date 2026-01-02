/**
 * Feature: resume-builder-auto-sender
 * Property 2: Resume Generation Round-Trip
 * Validates: Requirements 3.6
 *
 * For any valid UserProfile object and selected sections, generating a PDF resume
 * should produce a valid PDF with correct metadata and section tracking.
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { ResumeGeneratorService } from '../services/resume-generator.service';
import { TemplateRegistry } from '../templates/template.registry';
import { IUserProfile } from '@app/shared/interfaces/profile.interface';
import { ISectionSelection } from '@app/shared/interfaces/resume.interface';
import { SkillCategory, ProficiencyLevel } from '@app/shared/enums';

describe('Property 2: Resume Generation Round-Trip', () => {
  let module: TestingModule;
  let resumeGenerator: ResumeGeneratorService;

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

  // Simplified arbitraries for faster generation
  const addressArb = fc.record({
    city: fc.constantFrom('New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'),
    country: fc.constantFrom('USA', 'Canada', 'UK', 'Germany', 'France'),
  });

  const personalInfoArb = fc.record({
    firstName: fc.constantFrom('John', 'Jane', 'Bob', 'Alice', 'Charlie'),
    lastName: fc.constantFrom('Doe', 'Smith', 'Johnson', 'Williams', 'Brown'),
    email: fc.constantFrom('john@example.com', 'jane@example.com', 'bob@example.com'),
    phone: fc.constantFrom('555-1234', '555-5678', '555-9012'),
    address: addressArb,
    linkedIn: fc.option(fc.constant('https://linkedin.com/in/user'), { nil: undefined }),
    website: fc.option(fc.constant('https://example.com'), { nil: undefined }),
    summary: fc.option(fc.constantFrom(
      'Experienced software developer with expertise in web technologies.',
      'Senior engineer with 10 years of experience in cloud computing.',
      'Full-stack developer passionate about building scalable applications.',
    ), { nil: undefined }),
  });

  const workExperienceArb = fc.record({
    id: fc.hexaString({ minLength: 24, maxLength: 24 }),
    company: fc.constantFrom('Tech Corp', 'Acme Inc', 'Global Systems', 'StartupXYZ'),
    role: fc.constantFrom('Software Engineer', 'Senior Developer', 'Tech Lead', 'Architect'),
    startDate: fc.constantFrom(new Date('2020-01-01'), new Date('2019-06-01'), new Date('2018-03-15')),
    endDate: fc.option(fc.constantFrom(new Date('2023-12-31'), new Date('2022-06-30')), { nil: undefined }),
    current: fc.boolean(),
    description: fc.constantFrom(
      'Led development of core platform features.',
      'Designed and implemented microservices architecture.',
      'Mentored junior developers and conducted code reviews.',
    ),
    achievements: fc.array(
      fc.constantFrom('Improved performance by 50%', 'Reduced bugs by 30%', 'Led team of 5 engineers'),
      { minLength: 0, maxLength: 2 },
    ),
  });

  const educationArb = fc.record({
    id: fc.hexaString({ minLength: 24, maxLength: 24 }),
    institution: fc.constantFrom('MIT', 'Stanford', 'Harvard', 'Berkeley', 'CMU'),
    degree: fc.constantFrom('Bachelor', 'Master', 'PhD'),
    field: fc.constantFrom('Computer Science', 'Software Engineering', 'Data Science'),
    startDate: fc.constantFrom(new Date('2010-09-01'), new Date('2012-09-01'), new Date('2014-09-01')),
    endDate: fc.option(fc.constantFrom(new Date('2014-06-01'), new Date('2016-06-01')), { nil: undefined }),
    gpa: fc.option(fc.constantFrom(3.5, 3.7, 3.9, 4.0), { nil: undefined }),
    achievements: fc.array(
      fc.constantFrom('Magna Cum Laude', 'Deans List', 'Research Award'),
      { minLength: 0, maxLength: 2 },
    ),
  });

  const skillArb = fc.record({
    id: fc.hexaString({ minLength: 24, maxLength: 24 }),
    name: fc.constantFrom('TypeScript', 'Python', 'Java', 'React', 'Node.js', 'AWS'),
    category: fc.constantFrom(...Object.values(SkillCategory)),
    proficiencyLevel: fc.option(fc.constantFrom(...Object.values(ProficiencyLevel)), { nil: undefined }),
  });

  const profileArb = fc.record({
    id: fc.hexaString({ minLength: 24, maxLength: 24 }),
    userId: fc.hexaString({ minLength: 24, maxLength: 24 }),
    personalInfo: personalInfoArb,
    workExperience: fc.array(workExperienceArb, { minLength: 0, maxLength: 2 }),
    education: fc.array(educationArb, { minLength: 0, maxLength: 2 }),
    skills: fc.array(skillArb, { minLength: 0, maxLength: 5 }),
    version: fc.integer({ min: 1, max: 10 }),
    createdAt: fc.constant(new Date('2024-06-01')),
    updatedAt: fc.constant(new Date('2024-06-01')),
  });

  const templateIdArb = fc.constantFrom('modern', 'classic', 'minimal');

  const sectionSelectionArb = fc.record({
    personalInfo: fc.boolean(),
    summary: fc.boolean(),
    workExperience: fc.boolean(),
    education: fc.boolean(),
    skills: fc.boolean(),
  });

  describe('PDF Generation Validity', () => {
    it('should generate valid PDF buffer for any profile and template', async () => {
      await fc.assert(
        fc.asyncProperty(profileArb, templateIdArb, async (profile, templateId) => {
          const sections: ISectionSelection = {
            personalInfo: true,
            summary: true,
            workExperience: true,
            education: true,
            skills: true,
          };

          const result = await resumeGenerator.generate(profile as IUserProfile, {
            templateId,
            includeSections: sections,
          });

          expect(result.pdfBuffer).toBeDefined();
          expect(result.pdfBuffer.length).toBeGreaterThan(0);
          expect(result.pdfBuffer.slice(0, 5).toString()).toBe('%PDF-');
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Template Recording', () => {
    it('should always record the correct template used', async () => {
      await fc.assert(
        fc.asyncProperty(profileArb, templateIdArb, async (profile, templateId) => {
          const sections: ISectionSelection = {
            personalInfo: true,
            summary: false,
            workExperience: false,
            education: false,
            skills: false,
          };

          const result = await resumeGenerator.generate(profile as IUserProfile, {
            templateId,
            includeSections: sections,
          });

          expect(result.templateUsed).toBe(templateId);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Timestamp Generation', () => {
    it('should generate valid timestamp for each resume', async () => {
      await fc.assert(
        fc.asyncProperty(profileArb, templateIdArb, async (profile, templateId) => {
          const sections: ISectionSelection = {
            personalInfo: true,
            summary: false,
            workExperience: false,
            education: false,
            skills: false,
          };

          const before = new Date();
          const result = await resumeGenerator.generate(profile as IUserProfile, {
            templateId,
            includeSections: sections,
          });
          const after = new Date();

          expect(result.generatedAt).toBeDefined();
          expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
          expect(result.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Section Selection Tracking', () => {
    it('should correctly track all selected sections', async () => {
      await fc.assert(
        fc.asyncProperty(profileArb, templateIdArb, sectionSelectionArb, async (profile, templateId, sections) => {
          const result = await resumeGenerator.generate(profile as IUserProfile, {
            templateId,
            includeSections: sections,
          });

          if (sections.personalInfo) {
            expect(result.sectionsIncluded).toContain('personalInfo');
          } else {
            expect(result.sectionsIncluded).not.toContain('personalInfo');
          }
          if (sections.summary) {
            expect(result.sectionsIncluded).toContain('summary');
          } else {
            expect(result.sectionsIncluded).not.toContain('summary');
          }
          if (sections.workExperience) {
            expect(result.sectionsIncluded).toContain('workExperience');
          } else {
            expect(result.sectionsIncluded).not.toContain('workExperience');
          }
          if (sections.education) {
            expect(result.sectionsIncluded).toContain('education');
          } else {
            expect(result.sectionsIncluded).not.toContain('education');
          }
          if (sections.skills) {
            expect(result.sectionsIncluded).toContain('skills');
          } else {
            expect(result.sectionsIncluded).not.toContain('skills');
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('PDF Size Consistency', () => {
    it('should generate non-empty PDF for any valid input', async () => {
      await fc.assert(
        fc.asyncProperty(
          profileArb,
          templateIdArb,
          sectionSelectionArb,
          async (profile, templateId, sections) => {
            const result = await resumeGenerator.generate(profile as IUserProfile, {
              templateId,
              includeSections: sections,
            });

            expect(result.pdfBuffer.length).toBeGreaterThan(100);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
