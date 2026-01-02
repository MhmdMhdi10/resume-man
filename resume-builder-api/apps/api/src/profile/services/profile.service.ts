import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IUserProfile,
  IPersonalInfo,
  IWorkExperience,
  IEducation,
  ISkill,
} from '@app/shared/interfaces/profile.interface';
import {
  PersonalInfoDto,
  WorkExperienceDto,
  EducationDto,
  SkillDto,
} from '@app/shared/dto/profile.dto';
import { ProfileRepository } from '../repositories/profile.repository';
import { ProfileDocument } from '../schemas/profile.schema';

@Injectable()
export class ProfileService {
  constructor(private readonly profileRepository: ProfileRepository) {}

  private mapProfileToInterface(profile: ProfileDocument): IUserProfile {
    return {
      id: profile._id.toString(),
      userId: profile.userId.toString(),
      personalInfo: profile.personalInfo as IPersonalInfo,
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

  async getProfile(userId: string): Promise<IUserProfile> {
    const profile = await this.profileRepository.findOrCreateByUserId(userId);
    return this.mapProfileToInterface(profile);
  }


  async getProfileByUserId(userId: string): Promise<IUserProfile | null> {
    const profile = await this.profileRepository.findByUserId(userId);
    if (!profile) return null;
    return this.mapProfileToInterface(profile);
  }

  // Personal Info Operations
  async updatePersonalInfo(
    userId: string,
    dto: PersonalInfoDto,
    expectedVersion?: number,
  ): Promise<IUserProfile> {
    const profile = await this.profileRepository.updatePersonalInfo(
      userId,
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        linkedIn: dto.linkedIn,
        website: dto.website,
        summary: dto.summary,
      },
      expectedVersion,
    );

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.mapProfileToInterface(profile);
  }

  async getPersonalInfo(userId: string): Promise<IPersonalInfo | null> {
    const profile = await this.profileRepository.findOrCreateByUserId(userId);
    return profile.personalInfo as IPersonalInfo || null;
  }


  // Work Experience Operations
  async addWorkExperience(
    userId: string,
    dto: WorkExperienceDto,
    expectedVersion?: number,
  ): Promise<IUserProfile> {
    const profile = await this.profileRepository.addWorkExperience(
      userId,
      {
        company: dto.company,
        role: dto.role,
        startDate: dto.startDate,
        endDate: dto.endDate,
        current: dto.current,
        description: dto.description,
        achievements: dto.achievements,
      },
      expectedVersion,
    );

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.mapProfileToInterface(profile);
  }

  async updateWorkExperience(
    userId: string,
    experienceId: string,
    dto: Partial<WorkExperienceDto>,
    expectedVersion?: number,
  ): Promise<IUserProfile> {
    const profile = await this.profileRepository.updateWorkExperience(
      userId,
      experienceId,
      dto,
      expectedVersion,
    );

    if (!profile) {
      throw new NotFoundException('Profile or work experience not found');
    }

    return this.mapProfileToInterface(profile);
  }

  async deleteWorkExperience(
    userId: string,
    experienceId: string,
    expectedVersion?: number,
  ): Promise<IUserProfile> {
    const profile = await this.profileRepository.deleteWorkExperience(
      userId,
      experienceId,
      expectedVersion,
    );

    if (!profile) {
      throw new NotFoundException('Profile or work experience not found');
    }

    return this.mapProfileToInterface(profile);
  }

  async getWorkExperience(userId: string): Promise<IWorkExperience[]> {
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



  // Education Operations
  async addEducation(
    userId: string,
    dto: EducationDto,
    expectedVersion?: number,
  ): Promise<IUserProfile> {
    const profile = await this.profileRepository.addEducation(
      userId,
      {
        institution: dto.institution,
        degree: dto.degree,
        field: dto.field,
        startDate: dto.startDate,
        endDate: dto.endDate,
        gpa: dto.gpa,
        achievements: dto.achievements,
      },
      expectedVersion,
    );

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.mapProfileToInterface(profile);
  }

  async updateEducation(
    userId: string,
    educationId: string,
    dto: Partial<EducationDto>,
    expectedVersion?: number,
  ): Promise<IUserProfile> {
    const profile = await this.profileRepository.updateEducation(
      userId,
      educationId,
      dto,
      expectedVersion,
    );

    if (!profile) {
      throw new NotFoundException('Profile or education not found');
    }

    return this.mapProfileToInterface(profile);
  }

  async deleteEducation(
    userId: string,
    educationId: string,
    expectedVersion?: number,
  ): Promise<IUserProfile> {
    const profile = await this.profileRepository.deleteEducation(
      userId,
      educationId,
      expectedVersion,
    );

    if (!profile) {
      throw new NotFoundException('Profile or education not found');
    }

    return this.mapProfileToInterface(profile);
  }

  async getEducation(userId: string): Promise<IEducation[]> {
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


  // Skills Operations
  async addSkill(
    userId: string,
    dto: SkillDto,
    expectedVersion?: number,
  ): Promise<IUserProfile> {
    const profile = await this.profileRepository.addSkill(
      userId,
      {
        name: dto.name,
        category: dto.category,
        proficiencyLevel: dto.proficiencyLevel,
      },
      expectedVersion,
    );

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return this.mapProfileToInterface(profile);
  }

  async updateSkill(
    userId: string,
    skillId: string,
    dto: Partial<SkillDto>,
    expectedVersion?: number,
  ): Promise<IUserProfile> {
    const profile = await this.profileRepository.updateSkill(
      userId,
      skillId,
      dto,
      expectedVersion,
    );

    if (!profile) {
      throw new NotFoundException('Profile or skill not found');
    }

    return this.mapProfileToInterface(profile);
  }

  async deleteSkill(
    userId: string,
    skillId: string,
    expectedVersion?: number,
  ): Promise<IUserProfile> {
    const profile = await this.profileRepository.deleteSkill(
      userId,
      skillId,
      expectedVersion,
    );

    if (!profile) {
      throw new NotFoundException('Profile or skill not found');
    }

    return this.mapProfileToInterface(profile);
  }

  async getSkills(userId: string): Promise<ISkill[]> {
    const profile = await this.profileRepository.findOrCreateByUserId(userId);
    return (profile.skills || []).map((skill) => ({
      id: skill.id.toString(),
      name: skill.name,
      category: skill.category,
      proficiencyLevel: skill.proficiencyLevel,
    }));
  }

  async getSkillsByCategory(
    userId: string,
    category: string,
  ): Promise<ISkill[]> {
    const skills = await this.getSkills(userId);
    return skills.filter((skill) => skill.category === category);
  }


  // Profile deletion
  async deleteProfile(userId: string): Promise<boolean> {
    return this.profileRepository.delete(userId);
  }

  // Version history
  async getVersionHistory(userId: string, limit = 10) {
    return this.profileRepository.getVersionHistory(userId, limit);
  }
}
