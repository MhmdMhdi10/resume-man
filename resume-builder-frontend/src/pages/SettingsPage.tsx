import { useState, useEffect } from 'react';
import { settingsApi, notificationApi } from '../services/api';
import type { NotificationPreferences, AiModelSettings } from '../services/api';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'jobinja' | 'ai' | 'notifications'>('jobinja');

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('jobinja')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'jobinja'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Jobinja Account
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'ai'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              AI Model
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'notifications'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notifications
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'jobinja' && <JobinjaSettingsSection />}
          {activeTab === 'ai' && <AiModelSettingsSection />}
          {activeTab === 'notifications' && <NotificationSettingsSection />}
        </div>
      </div>
    </div>
  );
}

function AiModelSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AiModelSettings | null>(null);
  const [selectedModel, setSelectedModel] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsApi.getAiModelSettings();
      const data = response.data.data;
      setSettings(data);
      setSelectedModel(data.model);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await settingsApi.setAiModel(selectedModel);
      setSuccess('AI model updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save AI model');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">AI Model Selection</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose the AI model used for improving descriptions and extracting skills from your profile.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 p-4 rounded-md">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-3">
        {settings?.availableModels.map((model) => (
          <label
            key={model.id}
            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedModel === model.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="ai-model"
              value={model.id}
              checked={selectedModel === model.id}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <div className="ml-3">
              <span className="block text-sm font-medium text-gray-900">{model.name}</span>
              <span className="block text-sm text-gray-500">{model.description}</span>
              <span className="block text-xs text-gray-400 mt-1 font-mono">{model.id}</span>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || selectedModel === settings?.model}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Model'}
      </button>

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900">About AI Features</h4>
        <ul className="mt-2 text-sm text-gray-500 space-y-1">
          <li>• <strong>Improve Descriptions:</strong> Enhances your work experience descriptions to be more impactful</li>
          <li>• <strong>Extract Skills:</strong> Automatically identifies skills from your work experiences</li>
          <li>• Larger models provide better quality but may be slower</li>
        </ul>
      </div>
    </div>
  );
}

function JobinjaSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    try {
      const response = await settingsApi.getJobinjaCredentials();
      const data = response.data.data;
      setIsConfigured(data.isConfigured);
      setSavedEmail(data.email);
      setEmail(data.email);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setSaving(true);
    try {
      await settingsApi.setJobinjaCredentials({ email, password });
      setSuccess('Jobinja credentials saved successfully');
      setIsConfigured(true);
      setSavedEmail(email);
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Are you sure you want to remove your Jobinja credentials?')) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await settingsApi.clearJobinjaCredentials();
      setIsConfigured(false);
      setEmail('');
      setSavedEmail('');
      setPassword('');
      setSuccess('Jobinja credentials removed');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to clear credentials');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Jobinja Account</h3>
        <p className="mt-1 text-sm text-gray-500">
          Connect your Jobinja account to automatically apply for jobs. Your credentials are encrypted and stored securely.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 p-4 rounded-md">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {isConfigured && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-700 font-medium">Connected</span>
          </div>
          <p className="mt-1 text-sm text-green-600">
            Your Jobinja account ({savedEmail}) is connected and ready for auto-apply.
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="jobinja-email" className="block text-sm font-medium text-gray-700">
            Jobinja Email
          </label>
          <input
            type="email"
            id="jobinja-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your-email@example.com"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="jobinja-password" className="block text-sm font-medium text-gray-700">
            Jobinja Password
          </label>
          <input
            type="password"
            id="jobinja-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isConfigured ? '••••••••' : 'Enter your password'}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Your password is encrypted before being stored.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : isConfigured ? 'Update Credentials' : 'Save Credentials'}
          </button>
          {isConfigured && (
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              Remove Credentials
            </button>
          )}
        </div>
      </form>

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-900">How it works</h4>
        <ul className="mt-2 text-sm text-gray-500 space-y-1">
          <li>• Your Jobinja credentials are used to log in and submit job applications on your behalf</li>
          <li>• Passwords are encrypted using AES-256 encryption</li>
          <li>• You can remove your credentials at any time</li>
          <li>• We never share your credentials with third parties</li>
        </ul>
      </div>
    </div>
  );
}

function NotificationSettingsSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailEnabled: true,
    inAppEnabled: true,
    applicationUpdates: true,
    batchSummaries: true,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await notificationApi.getPreferences();
      setPreferences(response.data.data || response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await notificationApi.updatePreferences(preferences);
      setSuccess('Notification preferences saved');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose how you want to receive notifications about your job applications.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 p-4 rounded-md">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      <div className="space-y-4">
        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-900">Email Notifications</span>
            <p className="text-sm text-gray-500">Receive notifications via email</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.emailEnabled}
            onChange={(e) => setPreferences({ ...preferences, emailEnabled: e.target.checked })}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-900">In-App Notifications</span>
            <p className="text-sm text-gray-500">Show notifications in the app</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.inAppEnabled}
            onChange={(e) => setPreferences({ ...preferences, inAppEnabled: e.target.checked })}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-900">Application Updates</span>
            <p className="text-sm text-gray-500">Get notified when your application status changes</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.applicationUpdates}
            onChange={(e) => setPreferences({ ...preferences, applicationUpdates: e.target.checked })}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </label>

        <label className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-900">Batch Summaries</span>
            <p className="text-sm text-gray-500">Receive summaries of batch application results</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.batchSummaries}
            onChange={(e) => setPreferences({ ...preferences, batchSummaries: e.target.checked })}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Preferences'}
      </button>
    </div>
  );
}
