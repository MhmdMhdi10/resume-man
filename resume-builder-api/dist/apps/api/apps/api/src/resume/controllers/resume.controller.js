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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeController = void 0;
const common_1 = require("@nestjs/common");
const resume_service_1 = require("../services/resume.service");
const profile_service_1 = require("../../profile/services/profile.service");
const resume_dto_1 = require("../../../../../libs/shared/src/dto/resume.dto");
const auth_1 = require("../../auth");
let ResumeController = class ResumeController {
    constructor(resumeService, profileService) {
        this.resumeService = resumeService;
        this.profileService = profileService;
    }
    async generateResume(userId, dto) {
        const profile = await this.profileService.getProfile(userId);
        const savedResume = await this.resumeService.generateAndSave({
            userId,
            profile,
            options: {
                templateId: dto.templateId,
                includeSections: dto.includeSections,
                selectedExperiences: dto.selectedExperiences,
                selectedEducation: dto.selectedEducation,
                selectedSkills: dto.selectedSkills,
            },
            name: dto.name,
        });
        return {
            success: true,
            data: savedResume,
        };
    }
    async previewResume(userId, dto, res) {
        const profile = await this.profileService.getProfile(userId);
        const generated = await this.resumeService.generateResume(profile, {
            templateId: dto.templateId,
            includeSections: dto.includeSections,
            selectedExperiences: dto.selectedExperiences,
            selectedEducation: dto.selectedEducation,
            selectedSkills: dto.selectedSkills,
        });
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'inline; filename="preview.pdf"',
            'Content-Length': generated.pdfBuffer.length,
        });
        res.status(common_1.HttpStatus.OK).send(generated.pdfBuffer);
    }
    async getResumes(userId, page, limit) {
        const pagination = {
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 10,
        };
        const result = await this.resumeService.getResumes(userId, pagination);
        return {
            success: true,
            data: result.items,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
            },
        };
    }
    async getTemplates() {
        const templates = this.resumeService.getTemplates();
        return {
            success: true,
            data: templates,
        };
    }
    async getResume(userId, resumeId) {
        const resume = await this.resumeService.getResume(userId, resumeId);
        return {
            success: true,
            data: resume,
        };
    }
    async downloadResume(userId, resumeId, res) {
        const resume = await this.resumeService.getResume(userId, resumeId);
        const fileBuffer = await this.resumeService.getResumeFile(userId, resumeId);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${resume.name}.pdf"`,
            'Content-Length': fileBuffer.length,
        });
        res.status(common_1.HttpStatus.OK).send(fileBuffer);
    }
    async deleteResume(userId, resumeId) {
        await this.resumeService.deleteResume(userId, resumeId);
        return {
            success: true,
            message: 'Resume deleted successfully',
        };
    }
};
exports.ResumeController = ResumeController;
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, auth_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ResumeController.prototype, "generateResume", null);
__decorate([
    (0, common_1.Post)('preview'),
    __param(0, (0, auth_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, resume_dto_1.ResumeOptionsDto, Object]),
    __metadata("design:returntype", Promise)
], ResumeController.prototype, "previewResume", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ResumeController.prototype, "getResumes", null);
__decorate([
    (0, common_1.Get)('templates'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ResumeController.prototype, "getTemplates", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, auth_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ResumeController.prototype, "getResume", null);
__decorate([
    (0, common_1.Get)(':id/download'),
    __param(0, (0, auth_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ResumeController.prototype, "downloadResume", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, auth_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ResumeController.prototype, "deleteResume", null);
exports.ResumeController = ResumeController = __decorate([
    (0, common_1.Controller)('resumes'),
    (0, common_1.UseGuards)(auth_1.JwtAuthGuard),
    __metadata("design:paramtypes", [resume_service_1.ResumeService,
        profile_service_1.ProfileService])
], ResumeController);
//# sourceMappingURL=resume.controller.js.map