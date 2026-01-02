import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks';
import { dashboardApi, applicationApi, jobApi } from '../services/api';
import {
  setApplications,
  setLoading,
  setError,
  setPage,
  Application,
} from '../store/slices/applicationsSlice';

interface ApplicationStats {
  totalApplications: number;
  submittedCount: number;
  pendingCount: number;
  failedCount: number;
  successRate: number;
}

interface TimelineData {
  date: string;
  submitted: number;
  failed: number;
}

interface ApplicationWithJob extends Application {
  job?: {
    id: string;
    title: string;
    company: string;
    location: string;
  };
}

const STATUS_FILTERS = [
  { value: '', label: 'All Status' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { applications, loading, error, page, totalPages, totalCount } = useAppSelector(
    (state) => state.applications
  );

  const [stats, setStats] = useState<ApplicationStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithJob | null>(null);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const [statsResponse, timelineResponse] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getTimeline(30),
      ]);
      setStats(statsResponse.data);
      setTimeline(timelineResponse.data.timeline || timelineResponse.data || []);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadApplications = useCallback(async () => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await applicationApi.getApplications({
        status: statusFilter || undefined,
        page,
        limit: 10,
      });
      const data = response.data;
      dispatch(
        setApplications({
          applications: data.applications || data.data || [],
          totalPages: data.totalPages || Math.ceil((data.total || 0) / 10) || 1,
          totalCount: data.total || data.totalCount || 0,
          page,
        })
      );
    } catch (err: any) {
      dispatch(setError(err.response?.data?.message || 'Failed to load applications'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, statusFilter, page]);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    dispatch(setPage(1));
  };

  const handleViewApplication = async (application: Application) => {
    try {
      const jobResponse = await jobApi.getJob(application.jobId);
      setSelectedApplication({
        ...application,
        job: jobResponse.data,
      });
    } catch {
      setSelectedApplication(application as ApplicationWithJob);
    }
  };

  const handleCloseDetail = () => {
    setSelectedApplication(null);
  };

  const handleCancelApplication = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this application?')) return;
    try {
      await applicationApi.cancelApplication(id);
      loadApplications();
      loadStats();
      setSelectedApplication(null);
    } catch (err) {
      console.error('Failed to cancel application:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Application Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Track your job applications and progress</p>
      </div>

      {/* Statistics Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white shadow rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Applications"
            value={stats.totalApplications}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
            color="blue"
          />
          <StatCard
            title="Submitted"
            value={stats.submittedCount}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            }
            color="green"
          />
          <StatCard
            title="Pending"
            value={stats.pendingCount}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            color="yellow"
          />
          <StatCard
            title="Success Rate"
            value={`${Math.round(stats.successRate * 100)}%`}
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            }
            color="indigo"
          />
        </div>
      ) : null}

      {/* Timeline Chart */}
      {timeline.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Timeline (Last 30 Days)</h2>
          <TimelineChart data={timeline} />
        </div>
      )}

      {/* Applications List */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">
            Applications {totalCount > 0 && `(${totalCount})`}
          </h2>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-4 bg-red-50">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No applications found.</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {app.job?.title || 'Job Title'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {app.job?.company || 'Company'} • {app.job?.location || 'Location'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(app.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewApplication(app)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <button
                  onClick={() => dispatch(setPage(page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => dispatch(setPage(page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={handleCloseDetail}
          onCancel={handleCancelApplication}
          formatDateTime={formatDateTime}
        />
      )}
    </div>
  );
}


// Stat Card Component
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'indigo' | 'red';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>{icon}</div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Timeline Chart Component
interface TimelineChartProps {
  data: TimelineData[];
}

function TimelineChart({ data }: TimelineChartProps) {
  const maxValue = Math.max(...data.map((d) => d.submitted + d.failed), 1);

  return (
    <div className="h-48 flex items-end space-x-1">
      {data.slice(-14).map((item, index) => {
        const total = item.submitted + item.failed;
        const height = (total / maxValue) * 100;
        const submittedHeight = total > 0 ? (item.submitted / total) * height : 0;
        const failedHeight = total > 0 ? (item.failed / total) * height : 0;

        return (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div className="w-full flex flex-col justify-end h-40">
              {total > 0 ? (
                <>
                  <div
                    className="w-full bg-red-400 rounded-t"
                    style={{ height: `${failedHeight}%` }}
                    title={`Failed: ${item.failed}`}
                  />
                  <div
                    className="w-full bg-green-400"
                    style={{ height: `${submittedHeight}%` }}
                    title={`Submitted: ${item.submitted}`}
                  />
                </>
              ) : (
                <div className="w-full bg-gray-200 h-1 rounded" />
              )}
            </div>
            <span className="text-xs text-gray-400 mt-1">
              {new Date(item.date).getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Status Badge Component
interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Application Detail Modal Component
interface ApplicationDetailModalProps {
  application: ApplicationWithJob;
  onClose: () => void;
  onCancel: (id: string) => void;
  formatDateTime: (date: string) => string;
}

function ApplicationDetailModal({
  application,
  onClose,
  onCancel,
  formatDateTime,
}: ApplicationDetailModalProps) {
  const canCancel = application.status === 'pending' || application.status === 'processing';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold text-gray-900">Application Details</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Job Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Job</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {application.job?.title || 'Job Title'}
                </p>
                <p className="text-gray-600">
                  {application.job?.company || 'Company'} • {application.job?.location || 'Location'}
                </p>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <div className="mt-1">
                  <StatusBadge status={application.status} />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <p className="mt-1 text-gray-900">{formatDateTime(application.createdAt)}</p>
                </div>
                {application.submittedAt && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Submitted</h3>
                    <p className="mt-1 text-gray-900">{formatDateTime(application.submittedAt)}</p>
                  </div>
                )}
              </div>

              {/* Confirmation ID */}
              {application.confirmationId && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Confirmation ID</h3>
                  <p className="mt-1 text-gray-900 font-mono text-sm">{application.confirmationId}</p>
                </div>
              )}

              {/* Error Message */}
              {application.errorMessage && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Error</h3>
                  <p className="mt-1 text-red-600">{application.errorMessage}</p>
                </div>
              )}

              {/* Retry Count */}
              {application.retryCount > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Retry Attempts</h3>
                  <p className="mt-1 text-gray-900">{application.retryCount}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            {canCancel && (
              <button
                onClick={() => onCancel(application.id)}
                className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
              >
                Cancel Application
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full sm:w-auto mt-3 sm:mt-0 px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TimelineData {
  date: string;
  submitted: number;
  failed: number;
}

interface ApplicationWithJob extends Application {
  job?: {
    id: string;
    title: string;
    company: string;
    location: string;
  };
}
