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
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("../../../../../libs/shared/src");
const profile_service_1 = require("../services/profile.service");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
let ProfileController = class ProfileController {
    constructor(profileService) {
        this.profileService = profileService;
    }
    async getProfile(user) {
        return this.profileService.getProfile(user.userId);
    }
    async deleteProfile(user) {
        await this.profileService.deleteProfile(user.userId);
    }
    async getPersonalInfo(user) {
        return this.profileService.getPersonalInfo(user.userId);
    }
    async updatePersonalInfo(user, dto, version) {
        const expectedVersion = version ? parseInt(version, 10) : undefined;
        return this.profileService.updatePersonalInfo(user.userId, dto, expectedVersion);
    }
    async getWorkExperience(user) {
        return this.profileService.getWorkExperience(user.userId);
    }
    async addWorkExperience(user, dto, version) {
        const expectedVersion = version ? parseInt(version, 10) : undefined;
        return this.profileService.addWorkExperience(user.userId, dto, expectedVersion);
    }
    async updateWorkExperience(user, experienceId, dto, version) {
        const expectedVersion = version ? parseInt(version, 10) : undefined;
        return this.profileService.updateWorkExperience(user.userId, experienceId, dto, expectedVersion);
    }
    async deleteWorkExperience(user, experienceId, version) {
        const expectedVersion = version ? parseInt(version, 10) : undefined;
        return this.profileService.deleteWorkExperience(user.userId, experienceId, expectedVersion);
    }
    async getEducation(user) {
        return this.profileService.getEducation(user.userId);
    }
    async addEducation(user, dto, version) {
        const expectedVersion = version ? parseInt(version, 10) : undefined;
        return this.profileService.addEducation(user.userId, dto, expectedVersion);
    }
    async updateEducation(user, educationId, dto, version) {
        const expectedVersion = version ? parseInt(version, 10) : undefined;
        return this.profileService.updateEducation(user.userId, educationId, dto, expectedVersion);
    }
    async deleteEducation(user, educationId, version) {
        const expectedVersion = version ? parseInt(version, 10) : undefined;
        return this.profileService.deleteEducation(user.userId, educationId, expectedVersion);
    }
    async getSkills(user) {
        return this.profileService.getSkills(user.userId);
    }
    async getSkillsByCategory(user, category) {
        return this.profileService.getSkillsByCategory(user.userId, category);
    }
    async addSkill(user, dto, version) {
        const expectedVersion = version ? parseInt(version, 10) : undefined;
        return this.profileService.addSkill(user.userId, dto, expectedVersion);
    }
    async updateSkill(user, skillId, dto, version) {
        const expectedVersion = version ? parseInt(version, 10) : undefined;
        return this.profileService.updateSkill(user.userId, skillId, dto, expectedVersion);
    }
    async deleteSkill(user, skillId, version) {
        const expectedVersion = version ? parseInt(version, 10) : undefined;
        return this.profileService.deleteSkill(user.userId, skillId, expectedVersion);
    }
    async getVersionHistory(user, limit) {
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.profileService.getVersionHistory(user.userId, limitNum);
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Delete)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "deleteProfile", null);
__decorate([
    (0, common_1.Get)('personal-info'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getPersonalInfo", null);
__decorate([
    (0, common_1.Put)('personal-info'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, shared_1.PersonalInfoDto, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updatePersonalInfo", null);
__decorate([
    (0, common_1.Get)('work-experience'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getWorkExperience", null);
__decorate([
    (0, common_1.Post)('work-experience'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, shared_1.WorkExperienceDto, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "addWorkExperience", null);
__decorate([
    (0, common_1.Put)('work-experience/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, shared_1.UpdateWorkExperienceDto, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updateWorkExperience", null);
__decorate([
    (0, common_1.Delete)('work-experience/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "deleteWorkExperience", null);
__decorate([
    (0, common_1.Get)('education'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getEducation", null);
__decorate([
    (0, common_1.Post)('education'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, shared_1.EducationDto, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "addEducation", null);
__decorate([
    (0, common_1.Put)('education/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, shared_1.UpdateEducationDto, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updateEducation", null);
__decorate([
    (0, common_1.Delete)('education/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "deleteEducation", null);
__decorate([
    (0, common_1.Get)('skills'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getSkills", null);
__decorate([
    (0, common_1.Get)('skills/category/:category'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getSkillsByCategory", null);
__decorate([
    (0, common_1.Post)('skills'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Query)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, shared_1.SkillDto, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "addSkill", null);
__decorate([
    (0, common_1.Put)('skills/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Query)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, shared_1.UpdateSkillDto, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updateSkill", null);
__decorate([
    (0, common_1.Delete)('skills/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "deleteSkill", null);
__decorate([
    (0, common_1.Get)('versions'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "getVersionHistory", null);
exports.ProfileController = ProfileController = __decorate([
    (0, common_1.Controller)('profile'),
    __metadata("design:paramtypes", [profile_service_1.ProfileService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map