import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SkillCategory, ProficiencyLevel } from '@app/shared/enums';

export type ProfileDocument = Profile & Document;

// Nested schema for Address
@Schema({ _id: false })
export class Address {
  @Prop({ type: String, maxlength: 200 })
  street?: string;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 100 })
  city!: string;

  @Prop({ type: String, maxlength: 100 })
  state?: string;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 100 })
  country!: string;

  @Prop({ type: String, maxlength: 20 })
  postalCode?: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

// Nested schema for PersonalInfo
@Schema({ _id: false })
export class PersonalInfo {
  @Prop({ required: true, type: String, minlength: 1, maxlength: 50, trim: true })
  firstName!: string;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 50, trim: true })
  lastName!: string;

  @Prop({ required: true, type: String, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 20 })
  phone!: string;

  @Prop({ type: AddressSchema, required: true })
  address!: Address;

  @Prop({ type: String, maxlength: 200 })
  linkedIn?: string;

  @Prop({ type: String, maxlength: 200 })
  website?: string;

  @Prop({ type: String, maxlength: 1000 })
  summary?: string;
}

export const PersonalInfoSchema = SchemaFactory.createForClass(PersonalInfo);


// Nested schema for WorkExperience
@Schema({ timestamps: false })
export class WorkExperience {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  id!: Types.ObjectId;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 100, trim: true })
  company!: string;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 100, trim: true })
  role!: string;

  @Prop({ required: true, type: Date })
  startDate!: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ required: true, type: Boolean, default: false })
  current!: boolean;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 2000 })
  description!: string;

  @Prop({ type: [String], default: [] })
  achievements!: string[];
}

export const WorkExperienceSchema = SchemaFactory.createForClass(WorkExperience);

// Nested schema for Education
@Schema({ timestamps: false })
export class Education {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  id!: Types.ObjectId;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 200, trim: true })
  institution!: string;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 100, trim: true })
  degree!: string;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 100, trim: true })
  field!: string;

  @Prop({ required: true, type: Date })
  startDate!: Date;

  @Prop({ type: Date })
  endDate?: Date;

  @Prop({ type: Number, min: 0, max: 4 })
  gpa?: number;

  @Prop({ type: [String], default: [] })
  achievements!: string[];
}

export const EducationSchema = SchemaFactory.createForClass(Education);

// Nested schema for Skill
@Schema({ timestamps: false })
export class Skill {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  id!: Types.ObjectId;

  @Prop({ required: true, type: String, minlength: 1, maxlength: 100, trim: true })
  name!: string;

  @Prop({ required: true, type: String, enum: Object.values(SkillCategory) })
  category!: SkillCategory;

  @Prop({ type: String, enum: Object.values(ProficiencyLevel) })
  proficiencyLevel?: ProficiencyLevel;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);


// Main Profile schema
@Schema({
  timestamps: true,
  collection: 'profiles',
  optimisticConcurrency: true,
})
export class Profile {
  _id!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: PersonalInfoSchema })
  personalInfo?: PersonalInfo;

  @Prop({ type: [WorkExperienceSchema], default: [] })
  workExperience!: WorkExperience[];

  @Prop({ type: [EducationSchema], default: [] })
  education!: Education[];

  @Prop({ type: [SkillSchema], default: [] })
  skills!: Skill[];

  @Prop({ type: Number, default: 1 })
  version!: number;

  createdAt!: Date;
  updatedAt!: Date;

  // Virtual for full name
  get fullName(): string {
    if (this.personalInfo) {
      return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
    }
    return '';
  }
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);

// Add indexes
ProfileSchema.index({ userId: 1 });
ProfileSchema.index({ 'personalInfo.email': 1 });

// Pre-save hook to increment version
ProfileSchema.pre('findOneAndUpdate', function () {
  this.set({ $inc: { version: 1 } });
});
