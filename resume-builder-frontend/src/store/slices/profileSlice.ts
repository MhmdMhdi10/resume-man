import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  linkedIn?: string;
  website?: string;
  summary?: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  achievements: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: number;
  achievements: string[];
}

export interface Skill {
  id: string;
  name: string;
  category: 'technical' | 'soft' | 'language' | 'tool';
  proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface Profile {
  id: string;
  userId: string;
  personalInfo: PersonalInfo;
  workExperience: WorkExperience[];
  education: Education[];
  skills: Skill[];
  version: number;
}

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  profile: null,
  loading: false,
  error: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Profile>) => {
      state.profile = action.payload;
      state.error = null;
    },
    updatePersonalInfo: (state, action: PayloadAction<PersonalInfo>) => {
      if (state.profile) {
        state.profile.personalInfo = action.payload;
      }
    },
    addWorkExperience: (state, action: PayloadAction<WorkExperience>) => {
      if (state.profile) {
        state.profile.workExperience.push(action.payload);
      }
    },
    updateWorkExperience: (state, action: PayloadAction<WorkExperience>) => {
      if (state.profile) {
        const index = state.profile.workExperience.findIndex(
          (exp) => exp.id === action.payload.id
        );
        if (index !== -1) {
          state.profile.workExperience[index] = action.payload;
        }
      }
    },
    removeWorkExperience: (state, action: PayloadAction<string>) => {
      if (state.profile) {
        state.profile.workExperience = state.profile.workExperience.filter(
          (exp) => exp.id !== action.payload
        );
      }
    },
    addEducation: (state, action: PayloadAction<Education>) => {
      if (state.profile) {
        state.profile.education.push(action.payload);
      }
    },
    updateEducation: (state, action: PayloadAction<Education>) => {
      if (state.profile) {
        const index = state.profile.education.findIndex(
          (edu) => edu.id === action.payload.id
        );
        if (index !== -1) {
          state.profile.education[index] = action.payload;
        }
      }
    },
    removeEducation: (state, action: PayloadAction<string>) => {
      if (state.profile) {
        state.profile.education = state.profile.education.filter(
          (edu) => edu.id !== action.payload
        );
      }
    },
    addSkill: (state, action: PayloadAction<Skill>) => {
      if (state.profile) {
        state.profile.skills.push(action.payload);
      }
    },
    removeSkill: (state, action: PayloadAction<string>) => {
      if (state.profile) {
        state.profile.skills = state.profile.skills.filter(
          (skill) => skill.id !== action.payload
        );
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearProfile: (state) => {
      state.profile = null;
      state.error = null;
    },
  },
});

export const {
  setProfile,
  updatePersonalInfo,
  addWorkExperience,
  updateWorkExperience,
  removeWorkExperience,
  addEducation,
  updateEducation,
  removeEducation,
  addSkill,
  removeSkill,
  setLoading,
  setError,
  clearProfile,
} = profileSlice.actions;

export default profileSlice.reducer;
