import { useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import { notificationApi } from '../services/api';
import {
  setNotifications,
  markAsRead,
  markAllAsRead,
  setLoading,
  toggleDropdown,
  closeDropdown,
  addNotification,
  Notification,
} from '../store/slices/notificationsSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function NotificationDropdown() {
  const dispatch = useAppDispatch();
  const { notifications, unreadCount, loading, isDropdownOpen } = useAppSelector(
    (state) => state.notifications
  );
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const loadNotifications = useCallback(async () => {
    dispatch(setLoading(true));
    try {
      const response = await notificationApi.getNotifications(1, 20);
      const data = response.data;
      dispatch(
        setNotifications({
          notifications: data.notifications || data.data || [],
          totalPages: data.totalPages || 1,
          page: 1,
        })
      );
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  // Load notifications on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated, loadNotifications]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/notifications/ws';
    
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${wsUrl}?token=${token}`);

        ws.onopen = () => {
          console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
          try {
            const notification = JSON.parse(event.data) as Notification;
            dispatch(addNotification(notification));
          } catch (err) {
            console.error('Failed to parse notification:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          // Attempt to reconnect after 5 seconds
          setTimeout(() => {
            if (isAuthenticated) {
              connectWebSocket();
            }
          }, 5000);
        };

        wsRef.current = ws;
      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, dispatch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        dispatch(closeDropdown());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dispatch]);

  const handleToggle = () => {
    dispatch(toggleDropdown());
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      dispatch(markAsRead(id));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      dispatch(markAllAsRead());
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'application_submitted':
        return (
          <div className="p-2 bg-green-100 rounded-full">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'application_failed':
        return (
          <div className="p-2 bg-red-100 rounded-full">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'batch_complete':
        return (
          <div className="p-2 bg-blue-100 rounded-full">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 bg-gray-100 rounded-full">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        aria-label="Notifications"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                    className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                      !notification.read ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-sm text-gray-500 truncate">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200">
            <Link
              to="/settings/notifications"
              onClick={() => dispatch(closeDropdown())}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Notification Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
