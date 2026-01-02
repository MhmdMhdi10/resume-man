import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface JobListing {
  id: string;
  jabinjaId: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  category: string;
  experienceLevel: 'entry' | 'mid' | 'senior' | 'lead';
  postedAt: string;
  applicationUrl: string;
}

export interface JobFilters {
  keyword: string;
  location: string;
  category: string;
  experienceLevel: string;
}

interface JobsState {
  jobs: JobListing[];
  selectedJob: JobListing | null;
  selectedJobIds: string[];
  filters: JobFilters;
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
}

const initialState: JobsState = {
  jobs: [],
  selectedJob: null,
  selectedJobIds: [],
  filters: {
    keyword: '',
    location: '',
    category: '',
    experienceLevel: '',
  },
  loading: false,
  error: null,
  page: 1,
  totalPages: 1,
  totalCount: 0,
};

const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    setJobs: (
      state,
      action: PayloadAction<{
        jobs: JobListing[];
        totalPages: number;
        totalCount: number;
        page: number;
      }>
    ) => {
      state.jobs = action.payload.jobs;
      state.totalPages = action.payload.totalPages;
      state.totalCount = action.payload.totalCount;
      state.page = action.payload.page;
      state.error = null;
    },
    setSelectedJob: (state, action: PayloadAction<JobListing | null>) => {
      state.selectedJob = action.payload;
    },
    toggleJobSelection: (state, action: PayloadAction<string>) => {
      const jobId = action.payload;
      const index = state.selectedJobIds.indexOf(jobId);
      if (index === -1) {
        state.selectedJobIds.push(jobId);
      } else {
        state.selectedJobIds.splice(index, 1);
      }
    },
    clearJobSelection: (state) => {
      state.selectedJobIds = [];
    },
    setFilters: (state, action: PayloadAction<Partial<JobFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },
});

export const {
  setJobs,
  setSelectedJob,
  toggleJobSelection,
  clearJobSelection,
  setFilters,
  clearFilters,
  setLoading,
  setError,
  setPage,
} = jobsSlice.actions;

export default jobsSlice.reducer;
