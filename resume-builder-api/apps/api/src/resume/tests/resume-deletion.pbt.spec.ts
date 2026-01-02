/**
 * Feature: resume-builder-auto-sender
 * Property 11: Resume Deletion Completeness
 * Validates: Requirements 4.3
 *
 * For any deleted resume, subsequent retrieval attempts should return not-found,
 * and the associated storage file should be removed.
 */

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { ResumeService } from '../services/resume.service';
import { ResumeRepository } from '../repositories/resume.repository';
import { StorageService } from '../services/storage.service';
import { ResumeGeneratorService } from '../services/resume-generator.service';
import { TemplateRegistry } from '../templates/template.registry';
import { Resume } from '../schemas/resume.schema';
import { ConfigService } from '@nestjs/config';

// Mock storage service
class MockStorageService {
  private files: Map<string, Buffer> = new Map();

  generateKey(userId: string, filename: string): string {
    return `${userId}/${Date.now()}/${filename}`;
  }

  async uploadFile(buffer: Buffer, key: string): Promise<{ key: string; url: string; size: number }> {
    this.files.set(key, buffer);
    return { key, url: `http://storage/${key}`, size: buffer.length };
  }

  async getFile(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) {
      throw new Error('File not found');
    }
    return file;
  }

  async deleteFile(key: string): Promise<boolean> {
    return this.files.delete(key);
  }

  async fileExists(key: string): Promise<boolean> {
    return this.files.has(key);
  }

  getFileUrl(key: string): string {
    return `http://storage/${key}`;
  }

  reset() {
    this.files.clear();
  }
}

// Mock Resume Model
class MockResumeModel {
  static resumes: Map<string, any> = new Map();
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
    MockResumeModel.resumes.set(doc._id.toString(), doc);
    return doc;
  });

  static findById = jest.fn().mockImplementation((id: string) => ({
    exec: async () => MockResumeModel.resumes.get(id) || null,
  }));

  static findOne = jest.fn().mockImplementation((query: any) => ({
    exec: async () => {
      for (const [, resume] of MockResumeModel.resumes) {
        if (query._id && query.userId) {
          if (
            resume._id.toString() === query._id.toString() &&
            resume.userId.toString() === query.userId.toString()
          ) {
            return resume;
          }
        } else if (query.storageKey && resume.storageKey === query.storageKey) {
          return resume;
        }
      }
      return null;
    },
  }));

  static find = jest.fn().mockImplementation((query: any) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: async () => {
      const results: any[] = [];
      for (const [, resume] of MockResumeModel.resumes) {
        if (resume.userId.toString() === query.userId.toString()) {
          results.push(resume);
        }
      }
      return results;
    },
  }));

  static countDocuments = jest.fn().mockImplementation((query: any) => ({
    exec: async () => {
      let count = 0;
      for (const [, resume] of MockResumeModel.resumes) {
        if (resume.userId.toString() === query.userId.toString()) {
          count++;
        }
      }
      return count;
    },
  }));

  static findOneAndDelete = jest.fn().mockImplementation((query: any) => ({
    exec: async () => {
      for (const [id, resume] of MockResumeModel.resumes) {
        if (
          resume._id.toString() === query._id.toString() &&
          resume.userId.toString() === query.userId.toString()
        ) {
          MockResumeModel.resumes.delete(id);
          return resume;
        }
      }
      return null;
    },
  }));

  static deleteMany = jest.fn().mockImplementation((query: any) => ({
    exec: async () => {
      let deletedCount = 0;
      for (const [id, resume] of MockResumeModel.resumes) {
        if (resume.userId.toString() === query.userId.toString()) {
          MockResumeModel.resumes.delete(id);
          deletedCount++;
        }
      }
      return { deletedCount };
    },
  }));

  static reset() {
    MockResumeModel.resumes.clear();
  }
}

describe('Property 11: Resume Deletion Completeness', () => {
  let module: TestingModule;
  let resumeService: ResumeService;
  let mockStorage: MockStorageService;

  beforeAll(async () => {
    mockStorage = new MockStorageService();

    module = await Test.createTestingModule({
      providers: [
        ResumeService,
        ResumeRepository,
        ResumeGeneratorService,
        TemplateRegistry,
        {
          provide: getModelToken(Resume.name),
          useValue: MockResumeModel,
        },
        {
          provide: StorageService,
          useValue: mockStorage,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
        },
      ],
    }).compile();

    resumeService = module.get<ResumeService>(ResumeService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    MockResumeModel.reset();
    mockStorage.reset();
  });

  // Arbitraries
  const userIdArb = fc.hexaString({ minLength: 24, maxLength: 24 });
  const resumeNameArb = fc.constantFrom('My Resume', 'Professional CV', 'Tech Resume', 'Creative Resume');
  const templateIdArb = fc.constantFrom('modern', 'classic', 'minimal');

  // Helper to create a resume directly in the mock
  const createMockResume = async (userId: string, name: string, templateId: string) => {
    const storageKey = mockStorage.generateKey(userId, `${name}.pdf`);
    const pdfBuffer = Buffer.from('%PDF-1.4 test content');
    
    await mockStorage.uploadFile(pdfBuffer, storageKey);

    const resume = new MockResumeModel({
      _id: new Types.ObjectId(),
      userId: new Types.ObjectId(userId),
      name,
      templateId,
      storageKey,
      sectionsIncluded: ['personalInfo'],
      fileSize: pdfBuffer.length,
      mimeType: 'application/pdf',
    });

    return resume.save();
  };

  describe('Database Deletion', () => {
    it('should remove resume from database after deletion', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, resumeNameArb, templateIdArb, async (userId, name, templateId) => {
          MockResumeModel.reset();
          mockStorage.reset();

          // Create a resume
          const resume = await createMockResume(userId, name, templateId);
          const resumeId = resume._id.toString();

          // Verify it exists
          const existsBefore = await resumeService.resumeExists(userId, resumeId);
          expect(existsBefore).toBe(true);

          // Delete the resume
          await resumeService.deleteResume(userId, resumeId);

          // Property: Resume should not exist in database after deletion
          const existsAfter = await resumeService.resumeExists(userId, resumeId);
          expect(existsAfter).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('should throw NotFoundException when retrieving deleted resume', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, resumeNameArb, templateIdArb, async (userId, name, templateId) => {
          MockResumeModel.reset();
          mockStorage.reset();

          // Create and delete a resume
          const resume = await createMockResume(userId, name, templateId);
          const resumeId = resume._id.toString();
          await resumeService.deleteResume(userId, resumeId);

          // Property: Attempting to get deleted resume should throw NotFoundException
          await expect(resumeService.getResume(userId, resumeId)).rejects.toThrow(NotFoundException);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Storage Deletion', () => {
    it('should remove file from storage after deletion', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, resumeNameArb, templateIdArb, async (userId, name, templateId) => {
          MockResumeModel.reset();
          mockStorage.reset();

          // Create a resume
          const resume = await createMockResume(userId, name, templateId);
          const resumeId = resume._id.toString();
          const storageKey = resume.storageKey;

          // Verify file exists in storage
          const fileExistsBefore = await mockStorage.fileExists(storageKey);
          expect(fileExistsBefore).toBe(true);

          // Delete the resume
          await resumeService.deleteResume(userId, resumeId);

          // Property: File should not exist in storage after deletion
          const fileExistsAfter = await mockStorage.fileExists(storageKey);
          expect(fileExistsAfter).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('should throw NotFoundException when downloading deleted resume file', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, resumeNameArb, templateIdArb, async (userId, name, templateId) => {
          MockResumeModel.reset();
          mockStorage.reset();

          // Create and delete a resume
          const resume = await createMockResume(userId, name, templateId);
          const resumeId = resume._id.toString();
          await resumeService.deleteResume(userId, resumeId);

          // Property: Attempting to download deleted resume file should throw
          await expect(resumeService.getResumeFile(userId, resumeId)).rejects.toThrow(NotFoundException);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Multiple Resume Deletion', () => {
    it('should delete all resumes for a user', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.integer({ min: 1, max: 5 }),
          async (userId, resumeCount) => {
            MockResumeModel.reset();
            mockStorage.reset();

            // Create multiple resumes
            const resumes: any[] = [];
            for (let i = 0; i < resumeCount; i++) {
              const resume = await createMockResume(userId, `Resume ${i}`, 'modern');
              resumes.push(resume);
            }

            // Verify all exist
            const resultBefore = await resumeService.getResumes(userId, { page: 1, limit: 10 });
            expect(resultBefore.total).toBe(resumeCount);

            // Delete all
            const deletedCount = await resumeService.deleteAllResumes(userId);

            // Property: All resumes should be deleted
            expect(deletedCount).toBe(resumeCount);

            const resultAfter = await resumeService.getResumes(userId, { page: 1, limit: 10 });
            expect(resultAfter.total).toBe(0);
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should only delete resumes for specified user', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb.filter((id) => id !== '000000000000000000000000'),
          async (userId1, userId2) => {
            // Ensure different user IDs
            if (userId1 === userId2) return;

            MockResumeModel.reset();
            mockStorage.reset();

            // Create resumes for both users
            await createMockResume(userId1, 'User1 Resume', 'modern');
            await createMockResume(userId2, 'User2 Resume', 'classic');

            // Delete only user1's resumes
            await resumeService.deleteAllResumes(userId1);

            // Property: User2's resume should still exist
            const user2Resumes = await resumeService.getResumes(userId2, { page: 1, limit: 10 });
            expect(user2Resumes.total).toBe(1);

            // User1's resumes should be gone
            const user1Resumes = await resumeService.getResumes(userId1, { page: 1, limit: 10 });
            expect(user1Resumes.total).toBe(0);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Deletion Idempotency', () => {
    it('should throw NotFoundException when deleting non-existent resume', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          MockResumeModel.reset();
          mockStorage.reset();

          const nonExistentId = new Types.ObjectId().toString();

          // Property: Deleting non-existent resume should throw NotFoundException
          await expect(resumeService.deleteResume(userId, nonExistentId)).rejects.toThrow(NotFoundException);
        }),
        { numRuns: 100 },
      );
    });

    it('should throw NotFoundException when deleting already deleted resume', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, resumeNameArb, templateIdArb, async (userId, name, templateId) => {
          MockResumeModel.reset();
          mockStorage.reset();

          // Create and delete a resume
          const resume = await createMockResume(userId, name, templateId);
          const resumeId = resume._id.toString();
          await resumeService.deleteResume(userId, resumeId);

          // Property: Deleting again should throw NotFoundException
          await expect(resumeService.deleteResume(userId, resumeId)).rejects.toThrow(NotFoundException);
        }),
        { numRuns: 100 },
      );
    });
  });
});
