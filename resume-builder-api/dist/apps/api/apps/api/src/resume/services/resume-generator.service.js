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
var ResumeGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const template_registry_1 = require("../templates/template.registry");
let ResumeGeneratorService = ResumeGeneratorService_1 = class ResumeGeneratorService {
    constructor(templateRegistry) {
        this.templateRegistry = templateRegistry;
        this.logger = new common_1.Logger(ResumeGeneratorService_1.name);
    }
    async generate(profile, options) {
        this.logger.log(`Generating resume for user ${profile.userId} with template ${options.templateId}`);
        if (!this.templateRegistry.hasTemplate(options.templateId)) {
            throw new common_1.BadRequestException(`Template not found: ${options.templateId}`);
        }
        this.validateProfile(profile, options.includeSections);
        const template = this.templateRegistry.getTemplate(options.templateId);
        const pdfBuffer = await template.generate(profile, options.includeSections, options.selectedExperiences, options.selectedEducation, options.selectedSkills);
        const sectionsIncluded = this.getSectionsIncluded(options.includeSections);
        this.logger.log(`Resume generated successfully, size: ${pdfBuffer.length} bytes`);
        return {
            pdfBuffer,
            templateUsed: options.templateId,
            sectionsIncluded,
            generatedAt: new Date(),
        };
    }
    validateProfile(profile, sections) {
        if (sections.personalInfo && !profile.personalInfo) {
            throw new common_1.BadRequestException('Profile personal info is required');
        }
        if (sections.workExperience && (!profile.workExperience || profile.workExperience.length === 0)) {
            this.logger.warn('Work experience section selected but no experiences found');
        }
        if (sections.education && (!profile.education || profile.education.length === 0)) {
            this.logger.warn('Education section selected but no education entries found');
        }
        if (sections.skills && (!profile.skills || profile.skills.length === 0)) {
            this.logger.warn('Skills section selected but no skills found');
        }
    }
    getSectionsIncluded(sections) {
        const included = [];
        if (sections.personalInfo)
            included.push('personalInfo');
        if (sections.summary)
            included.push('summary');
        if (sections.workExperience)
            included.push('workExperience');
        if (sections.education)
            included.push('education');
        if (sections.skills)
            included.push('skills');
        return included;
    }
    getAvailableTemplates() {
        return this.templateRegistry.getAvailableTemplates();
    }
    getDefaultTemplateId() {
        return this.templateRegistry.getDefaultTemplateId();
    }
};
exports.ResumeGeneratorService = ResumeGeneratorService;
exports.ResumeGeneratorService = ResumeGeneratorService = ResumeGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [template_registry_1.TemplateRegistry])
], ResumeGeneratorService);
//# sourceMappingURL=resume-generator.service.js.map