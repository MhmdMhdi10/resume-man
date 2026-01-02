import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type NotificationType = 'application_submitted' | 'application_failed' | 'batch_complete';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  applicationUpdates: boolean;
  batchSummaries: boolean;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  isDropdownOpen: boolean;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  preferences: null,
  loading: false,
  error: null,
  page: 1,
  totalPages: 1,
  isDropdownOpen: false,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications: (
      state,
      action: PayloadAction<{
        notifications: Notification[];
        totalPages: number;
        page: number;
      }>
    ) => {
      if (action.payload.page === 1) {
        state.notifications = action.payload.notifications;
      } else {
        state.notifications = [...state.notifications, ...action.payload.notifications];
      }
      state.totalPages = action.payload.totalPages;
      state.page = action.payload.page;
      state.unreadCount = state.notifications.filter((n) => !n.read).length;
      state.error = null;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach((n) => {
        n.read = true;
      });
      state.unreadCount = 0;
    },
    setPreferences: (state, action: PayloadAction<NotificationPreferences>) => {
      state.preferences = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    toggleDropdown: (state) => {
      state.isDropdownOpen = !state.isDropdownOpen;
    },
    closeDropdown: (state) => {
      state.isDropdownOpen = false;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.page = action.payload;
    },
  },
});

export const {
  setNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  setPreferences,
  setLoading,
  setError,
  toggleDropdown,
  closeDropdown,
  setPage,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
