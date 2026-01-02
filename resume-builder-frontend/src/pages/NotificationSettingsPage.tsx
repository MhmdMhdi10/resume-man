import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks';
import { notificationApi } from '../services/api';
import { setPreferences, NotificationPreferences } from '../store/slices/notificationsSlice';

export default function NotificationSettingsPage() {
  const dispatch = useAppDispatch();
  const { preferences } = useAppSelector((state) => state.notifications);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState<NotificationPreferences>({
    emailEnabled: true,
    inAppEnabled: true,
    applicationUpdates: true,
    batchSummaries: true,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  useEffect(() => {
    if (preferences) {
      setFormData(preferences);
    }
  }, [preferences]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const response = await notificationApi.getPreferences();
      dispatch(setPreferences(response.data));
      setFormData(response.data);
    } catch (err) {
      console.error('Failed to load preferences:', err);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setFormData((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await notificationApi.updatePreferences(formData);
      dispatch(setPreferences(formData));
      setSuccess('Preferences saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage how you receive notifications about your job applications
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 p-4 rounded-md">
          <p className="text-green-700">{success}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
        {/* Notification Channels */}
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Channels</h2>
          <div className="space-y-4">
            <ToggleItem
              title="Email Notifications"
              description="Receive notifications via email"
              enabled={formData.emailEnabled}
              onToggle={() => handleToggle('emailEnabled')}
            />
            <ToggleItem
              title="In-App Notifications"
              description="Show notifications in the application"
              enabled={formData.inAppEnabled}
              onToggle={() => handleToggle('inAppEnabled')}
            />
          </div>
        </div>

        {/* Notification Types */}
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h2>
          <div className="space-y-4">
            <ToggleItem
              title="Application Updates"
              description="Get notified when your application status changes"
              enabled={formData.applicationUpdates}
              onToggle={() => handleToggle('applicationUpdates')}
            />
            <ToggleItem
              title="Batch Summaries"
              description="Receive summaries when batch applications complete"
              enabled={formData.batchSummaries}
              onToggle={() => handleToggle('batchSummaries')}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}

// Toggle Item Component
interface ToggleItemProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function ToggleItem({ title, description, enabled, onToggle }: ToggleItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          enabled ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
