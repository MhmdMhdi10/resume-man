import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ApplicationStatus = 'pending' | 'processing' | 'submitted' | 'failed' | 'cancelled';

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string;
  batchId: string;
  status: ApplicationStatus;
  retryCount: number;
  submittedAt?: string;
  confirmationId?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  job?: {
    title: string;
    company: string;
    location: string;
  };
}

export interface BatchSubmitResult {
  batchId: string;
  applications: {
    id: string;
    jobId: string;
    status: ApplicationStatus;
    queuedAt: string;
  }[];
  totalCount: number;
}

interface ApplicationsState {
  applications: Application[];
  currentBatch: BatchSubmitResult | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalCount: number;
}

const initialState: ApplicationsState = {
  applications: [],
  currentBatch: null,
  loading: false,
  submitting: false,
  error: null,
  page: 1,
  totalPages: 1,
  totalCount: 0,
};

const applicationsSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    setApplications: (
      state,
      action: PayloadAction<{
        applications: Application[];
        totalPages: number;
        totalCount: number;
        page: number;
      }>
    ) => {
      state.applications = action.payload.applications;
      state.totalPages = action.payload.totalPages;
      state.totalCount = action.payload.totalCount;
      state.page = action.payload.page;
      state.error = null;
    },
    setCurrentBatch: (state, action: PayloadAction<BatchSubmitResult | null>) => {
      state.currentBatch = action.payload;
    },
    updateApplicationStatus: (
      state,
      action: PayloadAction<{ id: string; status: ApplicationStatus }>
    ) => {
      const app = state.applications.find((a) => a.id === action.payload.id);
      if (app) {
        app.status = action.payload.status;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSubmitting: (state, action: PayloadAction<boolean>) => {
      state.submitting = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
    clearBatch: (state) => {
      state.currentBatch = null;
    },
  },
});

export const {
  setApplications,
  setCurrentBatch,
  updateApplicationStatus,
  setLoading,
  setSubmitting,
  setError,
  setPage,
  clearBatch,
} = applicationsSlice.actions;

export default applicationsSlice.reducer;
