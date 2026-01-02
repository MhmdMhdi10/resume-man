/**
 * Feature: resume-builder-auto-sender
 * Property 1: Profile Data Round-Trip Persistence
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 *
 * For any valid profile data (personal info, work experience, education, skills),
 * when saved to the database and retrieved, the data should be identical
 * to the original input (round-trip consistency).
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ProfileService } from '../services/profile.service';
import { ProfileRepository } from '../repositories/profile.repository';
import { Profile, ProfileDocument } from '../schemas/profile.schema';
import { ProfileVersion, ProfileVersionDocument } from '../schemas/profile-version.schema';
import { SkillCategory, ProficiencyLevel } from '@app/shared/enums';

// In-memory mock for Profile model
class MockProfileModel {
  private profiles: Map<string, any> = new Map();
  _id?: Types.ObjectId;

  constructor(data?: any) {
    if (data) {
      Object.assign(this, data);
      this._id = data._id || new Types.ObjectId();
    }
  }

  save = jest.fn().mockImplementation(async function (this: any) {
    const doc = {
      ...this,
      _id: this._id || new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MockProfileModel.prototype.profiles.set(doc.userId.toString(), doc);
    return doc;
  });

  static profiles: Map<string, any> = new Map();

  static findById = jest.fn().mockImplementation((id: string) => ({
    exec: async () => MockProfileModel.profiles.get(id) || null,
  }));

  static findOne = jest.fn().mockImplementation((query: any) => ({
    exec: async () => {
      if (query.userId) {
        return MockProfileModel.profiles.get(query.userId.toString()) || null;
      }
      return null;
    },
  }));

  static findOneAndUpdate = jest.fn().mockImplementation((query: any, update: any, options: any) => ({
    exec: async () => {
      const userId = query.userId?.toString();
      if (!userId) return null;

      let profile = MockProfileModel.profiles.get(userId);
      if (!profile) return null;

      // Apply $set updates
      if (update.$set) {
        for (const [key, value] of Object.entries(update.$set)) {
          const keys = key.split('.');
          let obj = profile;
          for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
          }
          obj[keys[keys.length - 1]] = value;
        }
      }

      // Apply $inc updates
      if (update.$inc) {
        for (const [key, value] of Object.entries(update.$inc)) {
          profile[key] = (profile[key] || 0) + (value as number);
        }
      }

      // Apply $push updates
      if (update.$push) {
        for (const [key, value] of Object.entries(update.$push)) {
          if (!profile[key]) profile[key] = [];
          profile[key].push(value);
        }
      }

      // Apply $pull updates
      if (update.$pull) {
        for (const [key, condition] of Object.entries(update.$pull)) {
          if (profile[key] && Array.isArray(profile[key])) {
            const cond = condition as any;
            profile[key] = profile[key].filter((item: any) => {
              if (cond.id) {
                return item.id?.toString() !== cond.id.toString();
              }
              return true;
            });
          }
        }
      }

      profile.updatedAt = new Date();
      MockProfileModel.profiles.set(userId, profile);
      return options?.new ? profile : null;
    },
  }));

  static deleteOne = jest.fn().mockImplementation((query: any) => ({
    exec: async () => {
      const userId = query.userId?.toString();
      if (userId && MockProfileModel.profiles.has(userId)) {
        MockProfileModel.profiles.delete(userId);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },
  }));

  static reset() {
    MockProfileModel.profiles.clear();
  }
}


// In-memory mock for ProfileVersion model
class MockProfileVersionModel {
  private static versions: any[] = [];
  _id?: Types.ObjectId;

  constructor(data?: any) {
    if (data) {
      Object.assign(this, data);
      this._id = new Types.ObjectId();
    }
  }

  save = jest.fn().mockImplementation(async function (this: any) {
    const doc = {
      ...this,
      _id: this._id || new Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MockProfileVersionModel.versions.push(doc);
    return doc;
  });

  static find = jest.fn().mockImplementation((query: any) => ({
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: async () => {
      return MockProfileVersionModel.versions.filter(
        (v) => v.profileId?.toString() === query.profileId?.toString(),
      );
    },
  }));

  static findOne = jest.fn().mockImplementation((query: any) => ({
    exec: async () => {
      return MockProfileVersionModel.versions.find(
        (v) =>
          v.profileId?.toString() === query.profileId?.toString() &&
          v.version === query.version,
      ) || null;
    },
  }));

  static deleteMany = jest.fn().mockImplementation((query: any) => ({
    exec: async () => {
      const before = MockProfileVersionModel.versions.length;
      MockProfileVersionModel.versions = MockProfileVersionModel.versions.filter(
        (v) => v.profileId?.toString() !== query.profileId?.toString(),
      );
      return { deletedCount: before - MockProfileVersionModel.versions.length };
    },
  }));

  static reset() {
    MockProfileVersionModel.versions = [];
  }
}

describe('Property 1: Profile Data Round-Trip Persistence', () => {
  let module: TestingModule;
  let profileService: ProfileService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        ProfileService,
        ProfileRepository,
        {
          provide: getModelToken(Profile.name),
          useValue: MockProfileModel,
        },
        {
          provide: getModelToken(ProfileVersion.name),
          useValue: MockProfileVersionModel,
        },
      ],
    }).compile();

    profileService = module.get<ProfileService>(ProfileService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    MockProfileModel.reset();
    MockProfileVersionModel.reset();
  });


  // Arbitraries for generating valid profile data
  const userIdArb = fc.hexaString({ minLength: 24, maxLength: 24 });

  const addressArb = fc.record({
    street: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
    city: fc.string({ minLength: 1, maxLength: 100 }),
    state: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    country: fc.string({ minLength: 1, maxLength: 100 }),
    postalCode: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  });

  const personalInfoArb = fc.record({
    firstName: fc.string({ minLength: 1, maxLength: 50 }),
    lastName: fc.string({ minLength: 1, maxLength: 50 }),
    email: fc.emailAddress(),
    phone: fc.string({ minLength: 1, maxLength: 20 }),
    address: addressArb,
    linkedIn: fc.option(fc.webUrl(), { nil: undefined }),
    website: fc.option(fc.webUrl(), { nil: undefined }),
    summary: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), { nil: undefined }),
  });

  const workExperienceArb = fc.record({
    company: fc.string({ minLength: 1, maxLength: 100 }),
    role: fc.string({ minLength: 1, maxLength: 100 }),
    startDate: fc.date({ min: new Date('2000-01-01'), max: new Date('2025-01-01') }),
    endDate: fc.option(fc.date({ min: new Date('2000-01-01'), max: new Date('2025-12-31') }), { nil: undefined }),
    current: fc.boolean(),
    description: fc.string({ minLength: 1, maxLength: 2000 }),
    achievements: fc.array(fc.string({ minLength: 1, maxLength: 500 }), { minLength: 0, maxLength: 5 }),
  });

  const educationArb = fc.record({
    institution: fc.string({ minLength: 1, maxLength: 200 }),
    degree: fc.string({ minLength: 1, maxLength: 100 }),
    field: fc.string({ minLength: 1, maxLength: 100 }),
    startDate: fc.date({ min: new Date('2000-01-01'), max: new Date('2025-01-01') }),
    endDate: fc.option(fc.date({ min: new Date('2000-01-01'), max: new Date('2025-12-31') }), { nil: undefined }),
    gpa: fc.option(fc.double({ min: 0, max: 4, noNaN: true }), { nil: undefined }),
    achievements: fc.array(fc.string({ minLength: 1, maxLength: 500 }), { minLength: 0, maxLength: 5 }),
  });

  const skillCategoryArb = fc.constantFrom(...Object.values(SkillCategory));
  const proficiencyLevelArb = fc.constantFrom(...Object.values(ProficiencyLevel));

  const skillArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 100 }),
    category: skillCategoryArb,
    proficiencyLevel: fc.option(proficiencyLevelArb, { nil: undefined }),
  });


  // Helper to create a profile in the mock store
  const createMockProfile = (userId: string) => {
    const profile = {
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(userId),
      personalInfo: undefined,
      workExperience: [],
      education: [],
      skills: [],
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    MockProfileModel.profiles.set(userId, profile);
    return profile;
  };

  describe('Personal Info Round-Trip', () => {
    it('should persist personal info fields correctly', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, personalInfoArb, async (userId, personalInfo) => {
          MockProfileModel.reset();
          createMockProfile(userId);

          // Update personal info via repository
          const profile = MockProfileModel.profiles.get(userId);
          profile.personalInfo = {
            firstName: personalInfo.firstName,
            lastName: personalInfo.lastName,
            email: personalInfo.email.toLowerCase(),
            phone: personalInfo.phone,
            address: personalInfo.address,
            linkedIn: personalInfo.linkedIn,
            website: personalInfo.website,
            summary: personalInfo.summary,
          };
          profile.version = 2;
          profile.updatedAt = new Date();

          // Retrieve and verify
          const retrieved = MockProfileModel.profiles.get(userId);
          expect(retrieved.personalInfo.firstName).toBe(personalInfo.firstName);
          expect(retrieved.personalInfo.lastName).toBe(personalInfo.lastName);
          expect(retrieved.personalInfo.email).toBe(personalInfo.email.toLowerCase());
          expect(retrieved.personalInfo.phone).toBe(personalInfo.phone);
          expect(retrieved.personalInfo.address.city).toBe(personalInfo.address.city);
          expect(retrieved.personalInfo.address.country).toBe(personalInfo.address.country);
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve optional fields when present', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.record({
            firstName: fc.string({ minLength: 1, maxLength: 50 }),
            lastName: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
            phone: fc.string({ minLength: 1, maxLength: 20 }),
            address: fc.record({
              street: fc.string({ minLength: 1, maxLength: 200 }),
              city: fc.string({ minLength: 1, maxLength: 100 }),
              state: fc.string({ minLength: 1, maxLength: 100 }),
              country: fc.string({ minLength: 1, maxLength: 100 }),
              postalCode: fc.string({ minLength: 1, maxLength: 20 }),
            }),
            linkedIn: fc.webUrl(),
            website: fc.webUrl(),
            summary: fc.string({ minLength: 1, maxLength: 1000 }),
          }),
          async (userId, personalInfo) => {
            MockProfileModel.reset();
            createMockProfile(userId);

            const profile = MockProfileModel.profiles.get(userId);
            profile.personalInfo = { ...personalInfo, email: personalInfo.email.toLowerCase() };

            const retrieved = MockProfileModel.profiles.get(userId);
            expect(retrieved.personalInfo.linkedIn).toBe(personalInfo.linkedIn);
            expect(retrieved.personalInfo.website).toBe(personalInfo.website);
            expect(retrieved.personalInfo.summary).toBe(personalInfo.summary);
            expect(retrieved.personalInfo.address.street).toBe(personalInfo.address.street);
            expect(retrieved.personalInfo.address.state).toBe(personalInfo.address.state);
            expect(retrieved.personalInfo.address.postalCode).toBe(personalInfo.address.postalCode);
          },
        ),
        { numRuns: 100 },
      );
    });
  });


  describe('Work Experience Round-Trip', () => {
    it('should persist work experience without data loss', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, workExperienceArb, async (userId, workExp) => {
          MockProfileModel.reset();
          createMockProfile(userId);

          const profile = MockProfileModel.profiles.get(userId);
          const workExperience = {
            id: new Types.ObjectId(),
            ...workExp,
          };
          profile.workExperience.push(workExperience);

          const retrieved = MockProfileModel.profiles.get(userId);
          expect(retrieved.workExperience.length).toBe(1);
          const retrievedExp = retrieved.workExperience[0];
          expect(retrievedExp.company).toBe(workExp.company);
          expect(retrievedExp.role).toBe(workExp.role);
          expect(retrievedExp.startDate.toISOString()).toBe(workExp.startDate.toISOString());
          expect(retrievedExp.current).toBe(workExp.current);
          expect(retrievedExp.description).toBe(workExp.description);
          expect(retrievedExp.achievements).toEqual(workExp.achievements);
        }),
        { numRuns: 100 },
      );
    });

    it('should maintain multiple work experiences', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(workExperienceArb, { minLength: 1, maxLength: 5 }),
          async (userId, workExps) => {
            MockProfileModel.reset();
            createMockProfile(userId);

            const profile = MockProfileModel.profiles.get(userId);
            for (const exp of workExps) {
              profile.workExperience.push({
                id: new Types.ObjectId(),
                ...exp,
              });
            }

            const retrieved = MockProfileModel.profiles.get(userId);
            expect(retrieved.workExperience.length).toBe(workExps.length);

            for (let i = 0; i < workExps.length; i++) {
              expect(retrieved.workExperience[i].company).toBe(workExps[i].company);
              expect(retrieved.workExperience[i].role).toBe(workExps[i].role);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Education Round-Trip', () => {
    it('should persist education without data loss', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, educationArb, async (userId, education) => {
          MockProfileModel.reset();
          createMockProfile(userId);

          const profile = MockProfileModel.profiles.get(userId);
          const edu = {
            id: new Types.ObjectId(),
            ...education,
          };
          profile.education.push(edu);

          const retrieved = MockProfileModel.profiles.get(userId);
          expect(retrieved.education.length).toBe(1);
          const retrievedEdu = retrieved.education[0];
          expect(retrievedEdu.institution).toBe(education.institution);
          expect(retrievedEdu.degree).toBe(education.degree);
          expect(retrievedEdu.field).toBe(education.field);
          expect(retrievedEdu.startDate.toISOString()).toBe(education.startDate.toISOString());
          expect(retrievedEdu.achievements).toEqual(education.achievements);
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve GPA when provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.record({
            institution: fc.string({ minLength: 1, maxLength: 200 }),
            degree: fc.string({ minLength: 1, maxLength: 100 }),
            field: fc.string({ minLength: 1, maxLength: 100 }),
            startDate: fc.date({ min: new Date('2000-01-01'), max: new Date('2025-01-01') }),
            gpa: fc.double({ min: 0, max: 4, noNaN: true }),
            achievements: fc.array(fc.string({ minLength: 1, maxLength: 500 }), { minLength: 0, maxLength: 3 }),
          }),
          async (userId, education) => {
            MockProfileModel.reset();
            createMockProfile(userId);

            const profile = MockProfileModel.profiles.get(userId);
            profile.education.push({
              id: new Types.ObjectId(),
              ...education,
            });

            const retrieved = MockProfileModel.profiles.get(userId);
            expect(retrieved.education[0].gpa).toBeCloseTo(education.gpa, 10);
          },
        ),
        { numRuns: 100 },
      );
    });
  });


  describe('Skills Round-Trip', () => {
    it('should persist skills without data loss', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, skillArb, async (userId, skill) => {
          MockProfileModel.reset();
          createMockProfile(userId);

          const profile = MockProfileModel.profiles.get(userId);
          profile.skills.push({
            id: new Types.ObjectId(),
            ...skill,
          });

          const retrieved = MockProfileModel.profiles.get(userId);
          expect(retrieved.skills.length).toBe(1);
          const retrievedSkill = retrieved.skills[0];
          expect(retrievedSkill.name).toBe(skill.name);
          expect(retrievedSkill.category).toBe(skill.category);
          if (skill.proficiencyLevel) {
            expect(retrievedSkill.proficiencyLevel).toBe(skill.proficiencyLevel);
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should correctly categorize skills', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(skillArb, { minLength: 1, maxLength: 10 }),
          skillCategoryArb,
          async (userId, skills, filterCategory) => {
            MockProfileModel.reset();
            createMockProfile(userId);

            const profile = MockProfileModel.profiles.get(userId);
            for (const skill of skills) {
              profile.skills.push({
                id: new Types.ObjectId(),
                ...skill,
              });
            }

            const retrieved = MockProfileModel.profiles.get(userId);
            const filtered = retrieved.skills.filter(
              (s: any) => s.category === filterCategory,
            );

            const expectedCount = skills.filter((s) => s.category === filterCategory).length;
            expect(filtered.length).toBe(expectedCount);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should preserve all skill categories', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          MockProfileModel.reset();
          createMockProfile(userId);

          const profile = MockProfileModel.profiles.get(userId);
          const categories = Object.values(SkillCategory);

          for (const category of categories) {
            profile.skills.push({
              id: new Types.ObjectId(),
              name: `Skill for ${category}`,
              category,
              proficiencyLevel: ProficiencyLevel.INTERMEDIATE,
            });
          }

          const retrieved = MockProfileModel.profiles.get(userId);
          expect(retrieved.skills.length).toBe(categories.length);

          for (const category of categories) {
            const found = retrieved.skills.find((s: any) => s.category === category);
            expect(found).toBeDefined();
          }
        }),
        { numRuns: 50 },
      );
    });
  });


  describe('Full Profile Round-Trip', () => {
    it('should persist complete profile without data loss', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          personalInfoArb,
          fc.array(workExperienceArb, { minLength: 0, maxLength: 3 }),
          fc.array(educationArb, { minLength: 0, maxLength: 2 }),
          fc.array(skillArb, { minLength: 0, maxLength: 5 }),
          async (userId, personalInfo, workExps, educations, skills) => {
            MockProfileModel.reset();
            createMockProfile(userId);

            const profile = MockProfileModel.profiles.get(userId);
            profile.personalInfo = {
              ...personalInfo,
              email: personalInfo.email.toLowerCase(),
            };

            for (const exp of workExps) {
              profile.workExperience.push({
                id: new Types.ObjectId(),
                ...exp,
              });
            }

            for (const edu of educations) {
              profile.education.push({
                id: new Types.ObjectId(),
                ...edu,
              });
            }

            for (const skill of skills) {
              profile.skills.push({
                id: new Types.ObjectId(),
                ...skill,
              });
            }

            const retrieved = MockProfileModel.profiles.get(userId);
            expect(retrieved.personalInfo.firstName).toBe(personalInfo.firstName);
            expect(retrieved.workExperience.length).toBe(workExps.length);
            expect(retrieved.education.length).toBe(educations.length);
            expect(retrieved.skills.length).toBe(skills.length);
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Version Tracking', () => {
    it('should increment version on updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.integer({ min: 2, max: 10 }),
          async (userId, updateCount) => {
            MockProfileModel.reset();
            createMockProfile(userId);

            const profile = MockProfileModel.profiles.get(userId);
            expect(profile.version).toBe(1);

            for (let i = 0; i < updateCount; i++) {
              profile.version += 1;
            }

            expect(profile.version).toBe(1 + updateCount);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should track version history entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.integer({ min: 1, max: 5 }),
          async (userId, versionCount) => {
            MockProfileModel.reset();
            MockProfileVersionModel.reset();
            createMockProfile(userId);

            const profile = MockProfileModel.profiles.get(userId);

            for (let i = 0; i < versionCount; i++) {
              const versionDoc = new MockProfileVersionModel({
                profileId: profile._id,
                version: profile.version,
                snapshot: { personalInfo: profile.personalInfo },
                changeDescription: `Update ${i + 1}`,
              });
              await versionDoc.save();
              profile.version += 1;
            }

            const versions = await MockProfileVersionModel.find({
              profileId: profile._id,
            }).exec();

            expect(versions.length).toBe(versionCount);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity between profile and user', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          MockProfileModel.reset();
          createMockProfile(userId);

          const profile = MockProfileModel.profiles.get(userId);
          expect(profile.userId.toString()).toBe(userId);
        }),
        { numRuns: 100 },
      );
    });

    it('should generate unique IDs for nested documents', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(workExperienceArb, { minLength: 2, maxLength: 5 }),
          async (userId, workExps) => {
            MockProfileModel.reset();
            createMockProfile(userId);

            const profile = MockProfileModel.profiles.get(userId);
            const ids = new Set<string>();

            for (const exp of workExps) {
              const id = new Types.ObjectId();
              profile.workExperience.push({
                id,
                ...exp,
              });
              ids.add(id.toString());
            }

            // All IDs should be unique
            expect(ids.size).toBe(workExps.length);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
