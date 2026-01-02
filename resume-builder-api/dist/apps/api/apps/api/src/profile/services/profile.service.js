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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const profile_repository_1 = require("../repositories/profile.repository");
let ProfileService = class ProfileService {
    constructor(profileRepository) {
        this.profileRepository = profileRepository;
    }
    mapProfileToInterface(profile) {
        return {
            id: profile._id.toString(),
            userId: profile.userId.toString(),
            personalInfo: profile.personalInfo,
            workExperience: (profile.workExperience || []).map((exp) => ({
                id: exp.id.toString(),
                company: exp.company,
                role: exp.role,
                startDate: exp.startDate,
                endDate: exp.endDate,
                current: exp.current,
                description: exp.description,
                achievements: exp.achievements,
            })),
            education: (profile.education || []).map((edu) => ({
                id: edu.id.toString(),
                institution: edu.institution,
                degree: edu.degree,
                field: edu.field,
                startDate: edu.startDate,
                endDate: edu.endDate,
                gpa: edu.gpa,
                achievements: edu.achievements,
            })),
            skills: (profile.skills || []).map((skill) => ({
                id: skill.id.toString(),
                name: skill.name,
                category: skill.category,
                proficiencyLevel: skill.proficiencyLevel,
            })),
            version: profile.version,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        };
    }
    async getProfile(userId) {
        const profile = await this.profileRepository.findOrCreateByUserId(userId);
        return this.mapProfileToInterface(profile);
    }
    async getProfileByUserId(userId) {
        const profile = await this.profileRepository.findByUserId(userId);
        if (!profile)
            return null;
        return this.mapProfileToInterface(profile);
    }
    async updatePersonalInfo(userId, dto, expectedVersion) {
        const profile = await this.profileRepository.updatePersonalInfo(userId, {
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            address: dto.address,
            linkedIn: dto.linkedIn,
            website: dto.website,
            summary: dto.summary,
        }, expectedVersion);
        if (!profile) {
            throw new common_1.NotFoundException('Profile not found');
        }
        return this.mapProfileToInterface(profile);
    }
    async getPersonalInfo(userId) {
        const profile = await this.profileRepository.findOrCreateByUserId(userId);
        return profile.personalInfo || null;
    }
    async addWorkExperience(userId, dto, expectedVersion) {
        const profile = await this.profileRepository.addWorkExperience(userId, {
            company: dto.company,
            role: dto.role,
            startDate: dto.startDate,
            endDate: dto.endDate,
            current: dto.current,
            description: dto.description,
            achievements: dto.achievements,
        }, expectedVersion);
        if (!profile) {
            throw new common_1.NotFoundException('Profile not found');
        }
        return this.mapProfileToInterface(profile);
    }
    async updateWorkExperience(userId, experienceId, dto, expectedVersion) {
        const profile = await this.profileRepository.updateWorkExperience(userId, experienceId, dto, expectedVersion);
        if (!profile) {
            throw new common_1.NotFoundException('Profile or work experience not found');
        }
        return this.mapProfileToInterface(profile);
    }
    async deleteWorkExperience(userId, experienceId, expectedVersion) {
        const profile = await this.profileRepository.deleteWorkExperience(userId, experienceId, expectedVersion);
        if (!profile) {
            throw new common_1.NotFoundException('Profile or work experience not found');
        }
        return this.mapProfileToInterface(profile);
    }
    async getWorkExperience(userId) {
        const profile = await this.profileRepository.findOrCreateByUserId(userId);
        return (profile.workExperience || []).map((exp) => ({
            id: exp.id.toString(),
            company: exp.company,
            role: exp.role,
            startDate: exp.startDate,
            endDate: exp.endDate,
            current: exp.current,
            description: exp.description,
            achievements: exp.achievements,
        }));
    }
    async addEducation(userId, dto, expectedVersion) {
        const profile = await this.profileRepository.addEducation(userId, {
            institution: dto.institution,
            degree: dto.degree,
            field: dto.field,
            startDate: dto.startDate,
            endDate: dto.endDate,
            gpa: dto.gpa,
            achievements: dto.achievements,
        }, expectedVersion);
        if (!profile) {
            throw new common_1.NotFoundException('Profile not found');
        }
        return this.mapProfileToInterface(profile);
    }
    async updateEducation(userId, educationId, dto, expectedVersion) {
        const profile = await this.profileRepository.updateEducation(userId, educationId, dto, expectedVersion);
        if (!profile) {
            throw new common_1.NotFoundException('Profile or education not found');
        }
        return this.mapProfileToInterface(profile);
    }
    async deleteEducation(userId, educationId, expectedVersion) {
        const profile = await this.profileRepository.deleteEducation(userId, educationId, expectedVersion);
        if (!profile) {
            throw new common_1.NotFoundException('Profile or education not found');
        }
        return this.mapProfileToInterface(profile);
    }
    async getEducation(userId) {
        const profile = await this.profileRepository.findOrCreateByUserId(userId);
        return (profile.education || []).map((edu) => ({
            id: edu.id.toString(),
            institution: edu.institution,
            degree: edu.degree,
            field: edu.field,
            startDate: edu.startDate,
            endDate: edu.endDate,
            gpa: edu.gpa,
            achievements: edu.achievements,
        }));
    }
    async addSkill(userId, dto, expectedVersion) {
        const profile = await this.profileRepository.addSkill(userId, {
            name: dto.name,
            category: dto.category,
            proficiencyLevel: dto.proficiencyLevel,
        }, expectedVersion);
        if (!profile) {
            throw new common_1.NotFoundException('Profile not found');
        }
        return this.mapProfileToInterface(profile);
    }
    async updateSkill(userId, skillId, dto, expectedVersion) {
        const profile = await this.profileRepository.updateSkill(userId, skillId, dto, expectedVersion);
        if (!profile) {
            throw new common_1.NotFoundException('Profile or skill not found');
        }
        return this.mapProfileToInterface(profile);
    }
    async deleteSkill(userId, skillId, expectedVersion) {
        const profile = await this.profileRepository.deleteSkill(userId, skillId, expectedVersion);
        if (!profile) {
            throw new common_1.NotFoundException('Profile or skill not found');
        }
        return this.mapProfileToInterface(profile);
    }
    async getSkills(userId) {
        const profile = await this.profileRepository.findOrCreateByUserId(userId);
        return (profile.skills || []).map((skill) => ({
            id: skill.id.toString(),
            name: skill.name,
            category: skill.category,
            proficiencyLevel: skill.proficiencyLevel,
        }));
    }
    async getSkillsByCategory(userId, category) {
        const skills = await this.getSkills(userId);
        return skills.filter((skill) => skill.category === category);
    }
    async deleteProfile(userId) {
        return this.profileRepository.delete(userId);
    }
    async getVersionHistory(userId, limit = 10) {
        return this.profileRepository.getVersionHistory(userId, limit);
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [profile_repository_1.ProfileRepository])
], ProfileService);
//# sourceMappingURL=profile.service.js.map