"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ResumeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeService = void 0;
const common_1 = require("@nestjs/common");
const resume_repository_1 = require("../repositories/resume.repository");
const storage_service_1 = require("./storage.service");
const resume_generator_service_1 = require("./resume-generator.service");
let ResumeService = ResumeService_1 = class ResumeService {
    constructor(resumeRepository, storageService, resumeGenerator) {
        this.resumeRepository = resumeRepository;
        this.storageService = storageService;
        this.resumeGenerator = resumeGenerator;
        this.logger = new common_1.Logger(ResumeService_1.name);
    }
    async generateResume(profile, options) {
        return this.resumeGenerator.generate(profile, options);
    }
    async generateAndSave(params) {
        const { userId, profile, options, name } = params;
        this.logger.log(`Generating and saving resume for user ${userId}`);
        const generated = await this.resumeGenerator.generate(profile, options);
        const storageKey = this.storageService.generateKey(userId, `${name}.pdf`);
        const uploadResult = await this.storageService.uploadFile(generated.pdfBuffer, storageKey, 'application/pdf');
        const resume = await this.resumeRepository.create({
            userId,
            name,
            templateId: generated.templateUsed,
            storageKey,
            sectionsIncluded: generated.sectionsIncluded,
            fileSize: uploadResult.size,
            mimeType: 'application/pdf',
        });
        this.logger.log(`Resume saved with id ${resume._id}`);
        return this.mapToSavedResume(resume);
    }
    async saveResume(userId, generated, name) {
        const storageKey = this.storageService.generateKey(userId, `${name}.pdf`);
        const uploadResult = await this.storageService.uploadFile(generated.pdfBuffer, storageKey, 'application/pdf');
        const resume = await this.resumeRepository.create({
            userId,
            name,
            templateId: generated.templateUsed,
            storageKey,
            sectionsIncluded: generated.sectionsIncluded,
            fileSize: uploadResult.size,
            mimeType: 'application/pdf',
        });
        return this.mapToSavedResume(resume);
    }
    async getResumes(userId, pagination) {
        const page = pagination.page || 1;
        const limit = pagination.limit || 10;
        const result = await this.resumeRepository.findByUserId(userId, { page, limit });
        return {
            items: result.items.map((r) => this.mapToSavedResume(r)),
            total: result.total,
            page: result.page,
            limit: result.limit,
            totalPages: result.totalPages,
        };
    }
    async getResume(userId, resumeId) {
        const resume = await this.resumeRepository.findByIdAndUserId(resumeId, userId);
        if (!resume) {
            throw new common_1.NotFoundException('Resume not found');
        }
        return this.mapToSavedResume(resume);
    }
    async getResumeFile(userId, resumeId) {
        const resume = await this.resumeRepository.findByIdAndUserId(resumeId, userId);
        if (!resume) {
            throw new common_1.NotFoundException('Resume not found');
        }
        try {
            return await this.storageService.getFile(resume.storageKey);
        }
        catch (error) {
            this.logger.error(`Failed to retrieve file for resume ${resumeId}:`, error);
            throw new common_1.NotFoundException('Resume file not found');
        }
    }
    async deleteResume(userId, resumeId) {
        const resume = await this.resumeRepository.findByIdAndUserId(resumeId, userId);
        if (!resume) {
            throw new common_1.NotFoundException('Resume not found');
        }
        const storageDeleted = await this.storageService.deleteFile(resume.storageKey);
        if (!storageDeleted) {
            this.logger.warn(`Failed to delete storage file for resume ${resumeId}`);
        }
        await this.resumeRepository.delete(resumeId, userId);
        this.logger.log(`Resume ${resumeId} deleted for user ${userId}`);
    }
    async deleteAllResumes(userId) {
        const result = await this.resumeRepository.findByUserId(userId, { page: 1, limit: 1000 });
        for (const resume of result.items) {
            await this.storageService.deleteFile(resume.storageKey);
        }
        return this.resumeRepository.deleteAllByUserId(userId);
    }
    async resumeExists(userId, resumeId) {
        const resume = await this.resumeRepository.findByIdAndUserId(resumeId, userId);
        return resume !== null;
    }
    async fileExists(userId, resumeId) {
        const resume = await this.resumeRepository.findByIdAndUserId(resumeId, userId);
        if (!resume) {
            return false;
        }
        return this.storageService.fileExists(resume.storageKey);
    }
    getTemplates() {
        return this.resumeGenerator.getAvailableTemplates();
    }
    mapToSavedResume(resume) {
        return {
            id: resume._id.toString(),
            userId: resume.userId.toString(),
            name: resume.name,
            templateId: resume.templateId,
            storageUrl: this.storageService.getFileUrl(resume.storageKey),
            sectionsIncluded: resume.sectionsIncluded,
            createdAt: resume.createdAt,
        };
    }
};
exports.ResumeService = ResumeService;
exports.ResumeService = ResumeService = ResumeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [resume_repository_1.ResumeRepository,
        storage_service_1.StorageService,
        resume_generator_service_1.ResumeGeneratorService])
], ResumeService);
//# sourceMappingURL=resume.service.js.map