import { SkillCategory, ProficiencyLevel } from '../enums';

export interface IAddress {
  street?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}

export interface IPersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: IAddress;
  linkedIn?: string;
  website?: string;
  summary?: string;
}

export interface IWorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: Date;
  endDate?: Date;
  current: boolean;
  description: string;
  achievements: string[];
}

export interface IEducation {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: Date;
  endDate?: Date;
  gpa?: number;
  achievements: string[];
}

export interface ISkill {
  id: string;
  name: string;
  category: SkillCategory;
  proficiencyLevel?: ProficiencyLevel;
}

export interface IUserProfile {
  id: string;
  userId: string;
  personalInfo: IPersonalInfo;
  workExperience: IWorkExperience[];
  education: IEducation[];
  skills: ISkill[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
