import { ExperienceLevel } from '../enums';

export interface IJobListing {
  id: string;
  jabinjaId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  category: string;
  experienceLevel: ExperienceLevel;
  postedAt: Date;
  applicationUrl: string;
}

export interface IJobSearchQuery {
  keyword?: string;
  location?: string;
  category?: string;
  experienceLevel?: ExperienceLevel;
  page: number;
  limit: number;
}
