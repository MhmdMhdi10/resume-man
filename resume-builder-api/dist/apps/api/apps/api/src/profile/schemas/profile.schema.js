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
exports.ProfileSchema = exports.Profile = exports.SkillSchema = exports.Skill = exports.EducationSchema = exports.Education = exports.WorkExperienceSchema = exports.WorkExperience = exports.PersonalInfoSchema = exports.PersonalInfo = exports.AddressSchema = exports.Address = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const enums_1 = require("../../../../../libs/shared/src/enums");
let Address = class Address {
};
exports.Address = Address;
__decorate([
    (0, mongoose_1.Prop)({ type: String, maxlength: 200 }),
    __metadata("design:type", String)
], Address.prototype, "street", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 100 }),
    __metadata("design:type", String)
], Address.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, maxlength: 100 }),
    __metadata("design:type", String)
], Address.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 100 }),
    __metadata("design:type", String)
], Address.prototype, "country", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, maxlength: 20 }),
    __metadata("design:type", String)
], Address.prototype, "postalCode", void 0);
exports.Address = Address = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], Address);
exports.AddressSchema = mongoose_1.SchemaFactory.createForClass(Address);
let PersonalInfo = class PersonalInfo {
};
exports.PersonalInfo = PersonalInfo;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 50, trim: true }),
    __metadata("design:type", String)
], PersonalInfo.prototype, "firstName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 50, trim: true }),
    __metadata("design:type", String)
], PersonalInfo.prototype, "lastName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, lowercase: true, trim: true }),
    __metadata("design:type", String)
], PersonalInfo.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 20 }),
    __metadata("design:type", String)
], PersonalInfo.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.AddressSchema, required: true }),
    __metadata("design:type", Address)
], PersonalInfo.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, maxlength: 200 }),
    __metadata("design:type", String)
], PersonalInfo.prototype, "linkedIn", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, maxlength: 200 }),
    __metadata("design:type", String)
], PersonalInfo.prototype, "website", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, maxlength: 1000 }),
    __metadata("design:type", String)
], PersonalInfo.prototype, "summary", void 0);
exports.PersonalInfo = PersonalInfo = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], PersonalInfo);
exports.PersonalInfoSchema = mongoose_1.SchemaFactory.createForClass(PersonalInfo);
let WorkExperience = class WorkExperience {
};
exports.WorkExperience = WorkExperience;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, default: () => new mongoose_2.Types.ObjectId() }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], WorkExperience.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 100, trim: true }),
    __metadata("design:type", String)
], WorkExperience.prototype, "company", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 100, trim: true }),
    __metadata("design:type", String)
], WorkExperience.prototype, "role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: Date }),
    __metadata("design:type", Date)
], WorkExperience.prototype, "startDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], WorkExperience.prototype, "endDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], WorkExperience.prototype, "current", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 2000 }),
    __metadata("design:type", String)
], WorkExperience.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], WorkExperience.prototype, "achievements", void 0);
exports.WorkExperience = WorkExperience = __decorate([
    (0, mongoose_1.Schema)({ timestamps: false })
], WorkExperience);
exports.WorkExperienceSchema = mongoose_1.SchemaFactory.createForClass(WorkExperience);
let Education = class Education {
};
exports.Education = Education;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, default: () => new mongoose_2.Types.ObjectId() }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Education.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 200, trim: true }),
    __metadata("design:type", String)
], Education.prototype, "institution", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 100, trim: true }),
    __metadata("design:type", String)
], Education.prototype, "degree", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 100, trim: true }),
    __metadata("design:type", String)
], Education.prototype, "field", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: Date }),
    __metadata("design:type", Date)
], Education.prototype, "startDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Date }),
    __metadata("design:type", Date)
], Education.prototype, "endDate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, min: 0, max: 4 }),
    __metadata("design:type", Number)
], Education.prototype, "gpa", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Education.prototype, "achievements", void 0);
exports.Education = Education = __decorate([
    (0, mongoose_1.Schema)({ timestamps: false })
], Education);
exports.EducationSchema = mongoose_1.SchemaFactory.createForClass(Education);
let Skill = class Skill {
};
exports.Skill = Skill;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, default: () => new mongoose_2.Types.ObjectId() }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Skill.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, minlength: 1, maxlength: 100, trim: true }),
    __metadata("design:type", String)
], Skill.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: String, enum: Object.values(enums_1.SkillCategory) }),
    __metadata("design:type", String)
], Skill.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(enums_1.ProficiencyLevel) }),
    __metadata("design:type", String)
], Skill.prototype, "proficiencyLevel", void 0);
exports.Skill = Skill = __decorate([
    (0, mongoose_1.Schema)({ timestamps: false })
], Skill);
exports.SkillSchema = mongoose_1.SchemaFactory.createForClass(Skill);
let Profile = class Profile {
    get fullName() {
        if (this.personalInfo) {
            return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
        }
        return '';
    }
};
exports.Profile = Profile;
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: mongoose_2.Types.ObjectId, ref: 'User', unique: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], Profile.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: exports.PersonalInfoSchema }),
    __metadata("design:type", PersonalInfo)
], Profile.prototype, "personalInfo", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.WorkExperienceSchema], default: [] }),
    __metadata("design:type", Array)
], Profile.prototype, "workExperience", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.EducationSchema], default: [] }),
    __metadata("design:type", Array)
], Profile.prototype, "education", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.SkillSchema], default: [] }),
    __metadata("design:type", Array)
], Profile.prototype, "skills", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number, default: 1 }),
    __metadata("design:type", Number)
], Profile.prototype, "version", void 0);
exports.Profile = Profile = __decorate([
    (0, mongoose_1.Schema)({
        timestamps: true,
        collection: 'profiles',
        optimisticConcurrency: true,
    })
], Profile);
exports.ProfileSchema = mongoose_1.SchemaFactory.createForClass(Profile);
exports.ProfileSchema.index({ userId: 1 });
exports.ProfileSchema.index({ 'personalInfo.email': 1 });
exports.ProfileSchema.pre('findOneAndUpdate', function () {
    this.set({ $inc: { version: 1 } });
});
//# sourceMappingURL=profile.schema.js.map