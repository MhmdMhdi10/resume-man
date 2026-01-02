import axios from 'axios';

// In Docker, use relative /api path which nginx will proxy
// In development, use direct localhost:3000
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// Profile API
export const profileApi = {
  getProfile: () => api.get('/profile'),
  updatePersonalInfo: (data: any) => api.put('/profile/personal-info', data),
  addWorkExperience: (data: any) => api.post('/profile/work-experience', data),
  updateWorkExperience: (id: string, data: any) => api.put(`/profile/work-experience/${id}`, data),
  deleteWorkExperience: (id: string) => api.delete(`/profile/work-experience/${id}`),
  addEducation: (data: any) => api.post('/profile/education', data),
  updateEducation: (id: string, data: any) => api.put(`/profile/education/${id}`, data),
  deleteEducation: (id: string) => api.delete(`/profile/education/${id}`),
  addSkill: (data: any) => api.post('/profile/skills', data),
  deleteSkill: (id: string) => api.delete(`/profile/skills/${id}`),
};

// Resume API
export const resumeApi = {
  getTemplates: () => api.get('/resume/templates'),
  generateResume: (data: any) => api.post('/resume/generate', data),
  getResumes: (page = 1, limit = 10) => api.get(`/resume?page=${page}&limit=${limit}`),
  getResume: (id: string) => api.get(`/resume/${id}`),
  downloadResume: (id: string) => api.get(`/resume/${id}/download`, { responseType: 'blob' }),
  deleteResume: (id: string) => api.delete(`/resume/${id}`),
};

// Job API
export interface JobSearchParams {
  keyword?: string;
  location?: string;
  category?: string;
  experienceLevel?: string;
  page?: number;
  limit?: number;
}

export const jobApi = {
  searchJobs: (params: JobSearchParams) => {
    const queryParams = new URLSearchParams();
    if (params.keyword) queryParams.append('keyword', params.keyword);
    if (params.location) queryParams.append('location', params.location);
    if (params.category) queryParams.append('category', params.category);
    if (params.experienceLevel) queryParams.append('experienceLevel', params.experienceLevel);
    queryParams.append('page', String(params.page || 1));
    queryParams.append('limit', String(params.limit || 10));
    return api.get(`/jobs?${queryParams.toString()}`);
  },
  getJob: (id: string) => api.get(`/jobs/${id}`),
};

// Application API
export interface BatchApplicationData {
  resumeId: string;
  jobIds: string[];
  coverLetter?: string;
}

export interface ApplicationFilters {
  status?: string;
  jobId?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export const applicationApi = {
  submitBatch: (data: BatchApplicationData) => api.post('/applications/batch', data),
  getApplications: (filters: ApplicationFilters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.jobId) queryParams.append('jobId', filters.jobId);
    if (filters.fromDate) queryParams.append('fromDate', filters.fromDate);
    if (filters.toDate) queryParams.append('toDate', filters.toDate);
    queryParams.append('page', String(filters.page || 1));
    queryParams.append('limit', String(filters.limit || 10));
    return api.get(`/applications?${queryParams.toString()}`);
  },
  getApplication: (id: string) => api.get(`/applications/${id}`),
  cancelApplication: (id: string) => api.delete(`/applications/${id}`),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getTimeline: (days = 30) => api.get(`/dashboard/timeline?days=${days}`),
};

// Notification API
export interface NotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  applicationUpdates: boolean;
  batchSummaries: boolean;
}

export const notificationApi = {
  getNotifications: (page = 1, limit = 20) =>
    api.get(`/notifications?page=${page}&limit=${limit}`),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  getPreferences: () => api.get('/notifications/preferences'),
  updatePreferences: (preferences: NotificationPreferences) =>
    api.put('/notifications/preferences', preferences),
};

// Settings API
export interface JobinjaCredentials {
  email: string;
  isConfigured: boolean;
}

export const settingsApi = {
  getJobinjaCredentials: () => api.get<{ success: boolean; data: JobinjaCredentials }>('/settings/jobinja'),
  setJobinjaCredentials: (data: { email: string; password: string }) =>
    api.post('/settings/jobinja', data),
  clearJobinjaCredentials: () => api.delete('/settings/jobinja'),
};
