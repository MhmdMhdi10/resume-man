import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  Profile,
  ProfileDocument,
  PersonalInfo,
  WorkExperience,
  Education,
  Skill,
} from '../schemas/profile.schema';
import { ProfileVersion, ProfileVersionDocument } from '../schemas/profile-version.schema';

export interface CreateProfileData {
  userId: string;
  personalInfo?: PersonalInfo;
}

export interface UpdatePersonalInfoData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  linkedIn?: string;
  website?: string;
  summary?: string;
}

export interface WorkExperienceData {
  company: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description: string;
  achievements: string[];
}

export interface EducationData {
  institution: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
  achievements: string[];
}

export interface SkillData {
  name: string;
  category: string;
  proficiencyLevel?: string;
}

@Injectable()
export class ProfileRepository {
  constructor(
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
    @InjectModel(ProfileVersion.name) private readonly profileVersionModel: Model<ProfileVersionDocument>,
  ) {}

  async create(data: CreateProfileData): Promise<ProfileDocument> {
    if (!Types.ObjectId.isValid(data.userId)) {
      throw new Error('Invalid user ID');
    }
    const profile = new this.profileModel({
      userId: new Types.ObjectId(data.userId),
      personalInfo: data.personalInfo,
      workExperience: [],
      education: [],
      skills: [],
      version: 1,
    });
    return profile.save();
  }

  async findById(id: string): Promise<ProfileDocument | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.profileModel.findById(id).exec();
  }

  async findByUserId(userId: string): Promise<ProfileDocument | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }
    return this.profileModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
  }

  async findOrCreateByUserId(userId: string): Promise<ProfileDocument> {
    let profile = await this.findByUserId(userId);
    if (!profile) {
      profile = await this.create({ userId });
    }
    return profile;
  }


  async updatePersonalInfo(
    userId: string,
    data: UpdatePersonalInfoData,
    expectedVersion?: number,
  ): Promise<ProfileDocument | null> {
    const profile = await this.findOrCreateByUserId(userId);
    
    // Optimistic locking check
    if (expectedVersion !== undefined && profile.version !== expectedVersion) {
      throw new ConflictException(
        `Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`,
      );
    }

    // Save version history before update
    await this.saveVersionHistory(profile, 'Updated personal info');

    const updateData: Record<string, unknown> = {};
    if (data.firstName !== undefined) updateData['personalInfo.firstName'] = data.firstName;
    if (data.lastName !== undefined) updateData['personalInfo.lastName'] = data.lastName;
    if (data.email !== undefined) updateData['personalInfo.email'] = data.email.toLowerCase();
    if (data.phone !== undefined) updateData['personalInfo.phone'] = data.phone;
    if (data.linkedIn !== undefined) updateData['personalInfo.linkedIn'] = data.linkedIn;
    if (data.website !== undefined) updateData['personalInfo.website'] = data.website;
    if (data.summary !== undefined) updateData['personalInfo.summary'] = data.summary;
    
    if (data.address) {
      if (data.address.street !== undefined) updateData['personalInfo.address.street'] = data.address.street;
      if (data.address.city !== undefined) updateData['personalInfo.address.city'] = data.address.city;
      if (data.address.state !== undefined) updateData['personalInfo.address.state'] = data.address.state;
      if (data.address.country !== undefined) updateData['personalInfo.address.country'] = data.address.country;
      if (data.address.postalCode !== undefined) updateData['personalInfo.address.postalCode'] = data.address.postalCode;
    }

    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: updateData, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
  }


  // Work Experience CRUD
  async addWorkExperience(
    userId: string,
    data: WorkExperienceData,
    expectedVersion?: number,
  ): Promise<ProfileDocument | null> {
    const profile = await this.findOrCreateByUserId(userId);
    
    if (expectedVersion !== undefined && profile.version !== expectedVersion) {
      throw new ConflictException(
        `Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`,
      );
    }

    await this.saveVersionHistory(profile, 'Added work experience');

    const workExperience: WorkExperience = {
      id: new Types.ObjectId(),
      ...data,
    } as WorkExperience;

    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $push: { workExperience }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
  }

  async updateWorkExperience(
    userId: string,
    experienceId: string,
    data: Partial<WorkExperienceData>,
    expectedVersion?: number,
  ): Promise<ProfileDocument | null> {
    if (!Types.ObjectId.isValid(experienceId)) {
      return null;
    }

    const profile = await this.findByUserId(userId);
    if (!profile) return null;

    if (expectedVersion !== undefined && profile.version !== expectedVersion) {
      throw new ConflictException(
        `Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`,
      );
    }

    await this.saveVersionHistory(profile, 'Updated work experience');

    const updateData: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[`workExperience.$.${key}`] = value;
      }
    });

    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), 'workExperience.id': new Types.ObjectId(experienceId) },
        { $set: updateData, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
  }

  async deleteWorkExperience(
    userId: string,
    experienceId: string,
    expectedVersion?: number,
  ): Promise<ProfileDocument | null> {
    if (!Types.ObjectId.isValid(experienceId)) {
      return null;
    }

    const profile = await this.findByUserId(userId);
    if (!profile) return null;

    if (expectedVersion !== undefined && profile.version !== expectedVersion) {
      throw new ConflictException(
        `Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`,
      );
    }

    await this.saveVersionHistory(profile, 'Deleted work experience');

    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $pull: { workExperience: { id: new Types.ObjectId(experienceId) } }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
  }


  // Education CRUD
  async addEducation(
    userId: string,
    data: EducationData,
    expectedVersion?: number,
  ): Promise<ProfileDocument | null> {
    const profile = await this.findOrCreateByUserId(userId);
    
    if (expectedVersion !== undefined && profile.version !== expectedVersion) {
      throw new ConflictException(
        `Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`,
      );
    }

    await this.saveVersionHistory(profile, 'Added education');

    const education: Education = {
      id: new Types.ObjectId(),
      ...data,
    } as Education;

    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $push: { education }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
  }

  async updateEducation(
    userId: string,
    educationId: string,
    data: Partial<EducationData>,
    expectedVersion?: number,
  ): Promise<ProfileDocument | null> {
    if (!Types.ObjectId.isValid(educationId)) {
      return null;
    }

    const profile = await this.findByUserId(userId);
    if (!profile) return null;

    if (expectedVersion !== undefined && profile.version !== expectedVersion) {
      throw new ConflictException(
        `Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`,
      );
    }

    await this.saveVersionHistory(profile, 'Updated education');

    const updateData: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[`education.$.${key}`] = value;
      }
    });

    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), 'education.id': new Types.ObjectId(educationId) },
        { $set: updateData, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
  }

  async deleteEducation(
    userId: string,
    educationId: string,
    expectedVersion?: number,
  ): Promise<ProfileDocument | null> {
    if (!Types.ObjectId.isValid(educationId)) {
      return null;
    }

    const profile = await this.findByUserId(userId);
    if (!profile) return null;

    if (expectedVersion !== undefined && profile.version !== expectedVersion) {
      throw new ConflictException(
        `Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`,
      );
    }

    await this.saveVersionHistory(profile, 'Deleted education');

    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $pull: { education: { id: new Types.ObjectId(educationId) } }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
  }


  // Skills CRUD
  async addSkill(
    userId: string,
    data: SkillData,
    expectedVersion?: number,
  ): Promise<ProfileDocument | null> {
    const profile = await this.findOrCreateByUserId(userId);
    
    if (expectedVersion !== undefined && profile.version !== expectedVersion) {
      throw new ConflictException(
        `Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`,
      );
    }

    await this.saveVersionHistory(profile, 'Added skill');

    const skill: Skill = {
      id: new Types.ObjectId(),
      name: data.name,
      category: data.category,
      proficiencyLevel: data.proficiencyLevel,
    } as Skill;

    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $push: { skills: skill }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
  }

  async updateSkill(
    userId: string,
    skillId: string,
    data: Partial<SkillData>,
    expectedVersion?: number,
  ): Promise<ProfileDocument | null> {
    if (!Types.ObjectId.isValid(skillId)) {
      return null;
    }

    const profile = await this.findByUserId(userId);
    if (!profile) return null;

    if (expectedVersion !== undefined && profile.version !== expectedVersion) {
      throw new ConflictException(
        `Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`,
      );
    }

    await this.saveVersionHistory(profile, 'Updated skill');

    const updateData: Record<string, unknown> = {};
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[`skills.$.${key}`] = value;
      }
    });

    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), 'skills.id': new Types.ObjectId(skillId) },
        { $set: updateData, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
  }

  async deleteSkill(
    userId: string,
    skillId: string,
    expectedVersion?: number,
  ): Promise<ProfileDocument | null> {
    if (!Types.ObjectId.isValid(skillId)) {
      return null;
    }

    const profile = await this.findByUserId(userId);
    if (!profile) return null;

    if (expectedVersion !== undefined && profile.version !== expectedVersion) {
      throw new ConflictException(
        `Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`,
      );
    }

    await this.saveVersionHistory(profile, 'Deleted skill');

    return this.profileModel
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $pull: { skills: { id: new Types.ObjectId(skillId) } }, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
  }


  // Version History
  private async saveVersionHistory(
    profile: ProfileDocument,
    changeDescription: string,
  ): Promise<void> {
    const snapshot = {
      personalInfo: profile.personalInfo,
      workExperience: profile.workExperience,
      education: profile.education,
      skills: profile.skills,
    };

    const versionRecord = new this.profileVersionModel({
      profileId: profile._id,
      version: profile.version,
      snapshot,
      changeDescription,
    });

    await versionRecord.save();
  }

  async getVersionHistory(
    userId: string,
    limit = 10,
  ): Promise<ProfileVersionDocument[]> {
    const profile = await this.findByUserId(userId);
    if (!profile) return [];

    return this.profileVersionModel
      .find({ profileId: profile._id })
      .sort({ version: -1 })
      .limit(limit)
      .exec();
  }

  async getVersionByNumber(
    userId: string,
    version: number,
  ): Promise<ProfileVersionDocument | null> {
    const profile = await this.findByUserId(userId);
    if (!profile) return null;

    return this.profileVersionModel
      .findOne({ profileId: profile._id, version })
      .exec();
  }


  // Delete profile
  async delete(userId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) {
      return false;
    }

    const profile = await this.findByUserId(userId);
    if (!profile) return false;

    // Delete all version history
    await this.profileVersionModel.deleteMany({ profileId: profile._id }).exec();

    // Delete the profile
    const result = await this.profileModel
      .deleteOne({ userId: new Types.ObjectId(userId) })
      .exec();

    return result.deletedCount > 0;
  }
}
