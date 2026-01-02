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
exports.ProfileRepository = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const profile_schema_1 = require("../schemas/profile.schema");
const profile_version_schema_1 = require("../schemas/profile-version.schema");
let ProfileRepository = class ProfileRepository {
    constructor(profileModel, profileVersionModel) {
        this.profileModel = profileModel;
        this.profileVersionModel = profileVersionModel;
    }
    async create(data) {
        if (!mongoose_2.Types.ObjectId.isValid(data.userId)) {
            throw new Error('Invalid user ID');
        }
        const profile = new this.profileModel({
            userId: new mongoose_2.Types.ObjectId(data.userId),
            personalInfo: data.personalInfo,
            workExperience: [],
            education: [],
            skills: [],
            version: 1,
        });
        return profile.save();
    }
    async findById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id)) {
            return null;
        }
        return this.profileModel.findById(id).exec();
    }
    async findByUserId(userId) {
        if (!mongoose_2.Types.ObjectId.isValid(userId)) {
            return null;
        }
        return this.profileModel.findOne({ userId: new mongoose_2.Types.ObjectId(userId) }).exec();
    }
    async findOrCreateByUserId(userId) {
        let profile = await this.findByUserId(userId);
        if (!profile) {
            profile = await this.create({ userId });
        }
        return profile;
    }
    async updatePersonalInfo(userId, data, expectedVersion) {
        const profile = await this.findOrCreateByUserId(userId);
        if (expectedVersion !== undefined && profile.version !== expectedVersion) {
            throw new common_1.ConflictException(`Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`);
        }
        await this.saveVersionHistory(profile, 'Updated personal info');
        const updateData = {};
        if (data.firstName !== undefined)
            updateData['personalInfo.firstName'] = data.firstName;
        if (data.lastName !== undefined)
            updateData['personalInfo.lastName'] = data.lastName;
        if (data.email !== undefined)
            updateData['personalInfo.email'] = data.email.toLowerCase();
        if (data.phone !== undefined)
            updateData['personalInfo.phone'] = data.phone;
        if (data.linkedIn !== undefined)
            updateData['personalInfo.linkedIn'] = data.linkedIn;
        if (data.website !== undefined)
            updateData['personalInfo.website'] = data.website;
        if (data.summary !== undefined)
            updateData['personalInfo.summary'] = data.summary;
        if (data.address) {
            if (data.address.street !== undefined)
                updateData['personalInfo.address.street'] = data.address.street;
            if (data.address.city !== undefined)
                updateData['personalInfo.address.city'] = data.address.city;
            if (data.address.state !== undefined)
                updateData['personalInfo.address.state'] = data.address.state;
            if (data.address.country !== undefined)
                updateData['personalInfo.address.country'] = data.address.country;
            if (data.address.postalCode !== undefined)
                updateData['personalInfo.address.postalCode'] = data.address.postalCode;
        }
        return this.profileModel
            .findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId) }, { $set: updateData, $inc: { version: 1 } }, { new: true })
            .exec();
    }
    async addWorkExperience(userId, data, expectedVersion) {
        const profile = await this.findOrCreateByUserId(userId);
        if (expectedVersion !== undefined && profile.version !== expectedVersion) {
            throw new common_1.ConflictException(`Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`);
        }
        await this.saveVersionHistory(profile, 'Added work experience');
        const workExperience = {
            id: new mongoose_2.Types.ObjectId(),
            ...data,
        };
        return this.profileModel
            .findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId) }, { $push: { workExperience }, $inc: { version: 1 } }, { new: true })
            .exec();
    }
    async updateWorkExperience(userId, experienceId, data, expectedVersion) {
        if (!mongoose_2.Types.ObjectId.isValid(experienceId)) {
            return null;
        }
        const profile = await this.findByUserId(userId);
        if (!profile)
            return null;
        if (expectedVersion !== undefined && profile.version !== expectedVersion) {
            throw new common_1.ConflictException(`Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`);
        }
        await this.saveVersionHistory(profile, 'Updated work experience');
        const updateData = {};
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                updateData[`workExperience.$.${key}`] = value;
            }
        });
        return this.profileModel
            .findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId), 'workExperience.id': new mongoose_2.Types.ObjectId(experienceId) }, { $set: updateData, $inc: { version: 1 } }, { new: true })
            .exec();
    }
    async deleteWorkExperience(userId, experienceId, expectedVersion) {
        if (!mongoose_2.Types.ObjectId.isValid(experienceId)) {
            return null;
        }
        const profile = await this.findByUserId(userId);
        if (!profile)
            return null;
        if (expectedVersion !== undefined && profile.version !== expectedVersion) {
            throw new common_1.ConflictException(`Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`);
        }
        await this.saveVersionHistory(profile, 'Deleted work experience');
        return this.profileModel
            .findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId) }, { $pull: { workExperience: { id: new mongoose_2.Types.ObjectId(experienceId) } }, $inc: { version: 1 } }, { new: true })
            .exec();
    }
    async addEducation(userId, data, expectedVersion) {
        const profile = await this.findOrCreateByUserId(userId);
        if (expectedVersion !== undefined && profile.version !== expectedVersion) {
            throw new common_1.ConflictException(`Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`);
        }
        await this.saveVersionHistory(profile, 'Added education');
        const education = {
            id: new mongoose_2.Types.ObjectId(),
            ...data,
        };
        return this.profileModel
            .findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId) }, { $push: { education }, $inc: { version: 1 } }, { new: true })
            .exec();
    }
    async updateEducation(userId, educationId, data, expectedVersion) {
        if (!mongoose_2.Types.ObjectId.isValid(educationId)) {
            return null;
        }
        const profile = await this.findByUserId(userId);
        if (!profile)
            return null;
        if (expectedVersion !== undefined && profile.version !== expectedVersion) {
            throw new common_1.ConflictException(`Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`);
        }
        await this.saveVersionHistory(profile, 'Updated education');
        const updateData = {};
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                updateData[`education.$.${key}`] = value;
            }
        });
        return this.profileModel
            .findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId), 'education.id': new mongoose_2.Types.ObjectId(educationId) }, { $set: updateData, $inc: { version: 1 } }, { new: true })
            .exec();
    }
    async deleteEducation(userId, educationId, expectedVersion) {
        if (!mongoose_2.Types.ObjectId.isValid(educationId)) {
            return null;
        }
        const profile = await this.findByUserId(userId);
        if (!profile)
            return null;
        if (expectedVersion !== undefined && profile.version !== expectedVersion) {
            throw new common_1.ConflictException(`Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`);
        }
        await this.saveVersionHistory(profile, 'Deleted education');
        return this.profileModel
            .findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId) }, { $pull: { education: { id: new mongoose_2.Types.ObjectId(educationId) } }, $inc: { version: 1 } }, { new: true })
            .exec();
    }
    async addSkill(userId, data, expectedVersion) {
        const profile = await this.findOrCreateByUserId(userId);
        if (expectedVersion !== undefined && profile.version !== expectedVersion) {
            throw new common_1.ConflictException(`Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`);
        }
        await this.saveVersionHistory(profile, 'Added skill');
        const skill = {
            id: new mongoose_2.Types.ObjectId(),
            name: data.name,
            category: data.category,
            proficiencyLevel: data.proficiencyLevel,
        };
        return this.profileModel
            .findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId) }, { $push: { skills: skill }, $inc: { version: 1 } }, { new: true })
            .exec();
    }
    async updateSkill(userId, skillId, data, expectedVersion) {
        if (!mongoose_2.Types.ObjectId.isValid(skillId)) {
            return null;
        }
        const profile = await this.findByUserId(userId);
        if (!profile)
            return null;
        if (expectedVersion !== undefined && profile.version !== expectedVersion) {
            throw new common_1.ConflictException(`Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`);
        }
        await this.saveVersionHistory(profile, 'Updated skill');
        const updateData = {};
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                updateData[`skills.$.${key}`] = value;
            }
        });
        return this.profileModel
            .findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId), 'skills.id': new mongoose_2.Types.ObjectId(skillId) }, { $set: updateData, $inc: { version: 1 } }, { new: true })
            .exec();
    }
    async deleteSkill(userId, skillId, expectedVersion) {
        if (!mongoose_2.Types.ObjectId.isValid(skillId)) {
            return null;
        }
        const profile = await this.findByUserId(userId);
        if (!profile)
            return null;
        if (expectedVersion !== undefined && profile.version !== expectedVersion) {
            throw new common_1.ConflictException(`Profile has been modified. Expected version ${expectedVersion}, but found ${profile.version}`);
        }
        await this.saveVersionHistory(profile, 'Deleted skill');
        return this.profileModel
            .findOneAndUpdate({ userId: new mongoose_2.Types.ObjectId(userId) }, { $pull: { skills: { id: new mongoose_2.Types.ObjectId(skillId) } }, $inc: { version: 1 } }, { new: true })
            .exec();
    }
    async saveVersionHistory(profile, changeDescription) {
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
    async getVersionHistory(userId, limit = 10) {
        const profile = await this.findByUserId(userId);
        if (!profile)
            return [];
        return this.profileVersionModel
            .find({ profileId: profile._id })
            .sort({ version: -1 })
            .limit(limit)
            .exec();
    }
    async getVersionByNumber(userId, version) {
        const profile = await this.findByUserId(userId);
        if (!profile)
            return null;
        return this.profileVersionModel
            .findOne({ profileId: profile._id, version })
            .exec();
    }
    async delete(userId) {
        if (!mongoose_2.Types.ObjectId.isValid(userId)) {
            return false;
        }
        const profile = await this.findByUserId(userId);
        if (!profile)
            return false;
        await this.profileVersionModel.deleteMany({ profileId: profile._id }).exec();
        const result = await this.profileModel
            .deleteOne({ userId: new mongoose_2.Types.ObjectId(userId) })
            .exec();
        return result.deletedCount > 0;
    }
};
exports.ProfileRepository = ProfileRepository;
exports.ProfileRepository = ProfileRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(profile_schema_1.Profile.name)),
    __param(1, (0, mongoose_1.InjectModel)(profile_version_schema_1.ProfileVersion.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model])
], ProfileRepository);
//# sourceMappingURL=profile.repository.js.map