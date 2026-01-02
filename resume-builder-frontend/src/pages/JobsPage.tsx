import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import { jobApi } from '../services/api';
import {
  setJobs,
  setSelectedJob,
  toggleJobSelection,
  clearJobSelection,
  setFilters,
  clearFilters,
  setLoading,
  setError,
  setPage,
  JobListing,
} from '../store/slices/jobsSlice';

const EXPERIENCE_LEVELS = [
  { value: '', label: 'All Levels' },
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'lead', label: 'Lead/Manager' },
];

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'engineering', label: 'Engineering' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'operations', label: 'Operations' },
  { value: 'other', label: 'Other' },
];

export default function JobsPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { jobs, selectedJob, selectedJobIds, filters, loading, error, page, totalPages, totalCount } =
    useAppSelector((state) => state.jobs);

  const [searchKeyword, setSearchKeyword] = useState(filters.keyword);
  const [searchLocation, setSearchLocation] = useState(filters.location);

  const loadJobs = useCallback(async () => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await jobApi.searchJobs({
        keyword: filters.keyword,
        location: filters.location,
        category: filters.category,
        experienceLevel: filters.experienceLevel,
        page,
        limit: 10,
      });
      const data = response.data;
      dispatch(
        setJobs({
          jobs: data.jobs || data.data || [],
          totalPages: data.totalPages || Math.ceil((data.total || 0) / 10) || 1,
          totalCount: data.total || data.totalCount || 0,
          page,
        })
      );
    } catch (err: any) {
      dispatch(setError(err.response?.data?.message || 'Failed to load jobs'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, filters, page]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setFilters({ keyword: searchKeyword, location: searchLocation }));
    dispatch(setPage(1));
  };

  const handleFilterChange = (key: string, value: string) => {
    dispatch(setFilters({ [key]: value }));
    dispatch(setPage(1));
  };

  const handleClearFilters = () => {
    setSearchKeyword('');
    setSearchLocation('');
    dispatch(clearFilters());
    dispatch(setPage(1));
  };

  const handleJobClick = async (job: JobListing) => {
    try {
      const response = await jobApi.getJob(job.id);
      dispatch(setSelectedJob(response.data));
    } catch {
      dispatch(setSelectedJob(job));
    }
  };

  const handleCloseModal = () => {
    dispatch(setSelectedJob(null));
  };

  const handleToggleSelection = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(toggleJobSelection(jobId));
  };

  const handleBatchApply = () => {
    if (selectedJobIds.length === 0) return;
    navigate('/apply', { state: { jobIds: selectedJobIds } });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getExperienceLevelLabel = (level: string) => {
    const found = EXPERIENCE_LEVELS.find((l) => l.value === level);
    return found ? found.label : level;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Search</h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalCount > 0 ? `${totalCount} jobs found` : 'Search for jobs on Jabinja'}
          </p>
        </div>
        {selectedJobIds.length > 0 && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedJobIds.length} job{selectedJobIds.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => dispatch(clearJobSelection())}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
            <button
              onClick={handleBatchApply}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Apply to Selected
            </button>
          </div>
        )}
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-white shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">
              Keywords
            </label>
            <input
              type="text"
              id="keyword"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Job title, skills, or company"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              id="location"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              placeholder="City, state, or remote"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Search Jobs
            </button>
          </div>
        </div>
      </form>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label htmlFor="category" className="block text-xs font-medium text-gray-500 mb-1">
              Category
            </label>
            <select
              id="category"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="experienceLevel" className="block text-xs font-medium text-gray-500 mb-1">
              Experience Level
            </label>
            <select
              id="experienceLevel"
              value={filters.experienceLevel}
              onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>
          {(filters.keyword || filters.location || filters.category || filters.experienceLevel) && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-indigo-600 hover:text-indigo-800 mt-5"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {/* Job Listings */}
      {!loading && jobs.length === 0 && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">No jobs found. Try adjusting your search criteria.</p>
        </div>
      )}

      {!loading && jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isSelected={selectedJobIds.includes(job.id)}
              onToggleSelection={handleToggleSelection}
              onClick={() => handleJobClick(job)}
              formatDate={formatDate}
              getExperienceLevelLabel={getExperienceLevelLabel}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="bg-white shadow rounded-lg px-4 py-3 flex items-center justify-between">
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

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isSelected={selectedJobIds.includes(selectedJob.id)}
          onClose={handleCloseModal}
          onToggleSelection={() => dispatch(toggleJobSelection(selectedJob.id))}
          onApply={() => navigate('/apply', { state: { jobIds: [selectedJob.id] } })}
          formatDate={formatDate}
          getExperienceLevelLabel={getExperienceLevelLabel}
        />
      )}
    </div>
  );
}


// Job Card Component
interface JobCardProps {
  job: JobListing;
  isSelected: boolean;
  onToggleSelection: (jobId: string, e: React.MouseEvent) => void;
  onClick: () => void;
  formatDate: (date: string) => string;
  getExperienceLevelLabel: (level: string) => string;
}

function JobCard({
  job,
  isSelected,
  onToggleSelection,
  onClick,
  formatDate,
  getExperienceLevelLabel,
}: JobCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white shadow rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow ${
        isSelected ? 'ring-2 ring-indigo-500' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              onClick={(e) => onToggleSelection(job.id, e)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
          </div>
          <p className="text-gray-600 mt-1">{job.company}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="inline-flex items-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {job.location}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {job.category}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              {getExperienceLevelLabel(job.experienceLevel)}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-2 line-clamp-2">{job.description}</p>
        </div>
        <div className="text-right ml-4">
          <span className="text-sm text-gray-400">{formatDate(job.postedAt)}</span>
        </div>
      </div>
    </div>
  );
}

// Job Detail Modal Component
interface JobDetailModalProps {
  job: JobListing;
  isSelected: boolean;
  onClose: () => void;
  onToggleSelection: () => void;
  onApply: () => void;
  formatDate: (date: string) => string;
  getExperienceLevelLabel: (level: string) => string;
}

function JobDetailModal({
  job,
  isSelected,
  onClose,
  onToggleSelection,
  onApply,
  formatDate,
  getExperienceLevelLabel,
}: JobDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
                <p className="text-lg text-gray-600 mt-1">{job.company}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <span className="inline-flex items-center text-sm text-gray-500">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {job.location}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-sm font-medium bg-blue-100 text-blue-800">
                {job.category}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-sm font-medium bg-green-100 text-green-800">
                {getExperienceLevelLabel(job.experienceLevel)}
              </span>
              <span className="text-sm text-gray-400">Posted {formatDate(job.postedAt)}</span>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Description</h3>
              <p className="mt-2 text-gray-600 whitespace-pre-line">{job.description}</p>
            </div>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Requirements</h3>
                <ul className="mt-2 space-y-1">
                  {job.requirements.map((req, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
            <button
              onClick={onApply}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
            >
              Apply Now
            </button>
            <button
              onClick={onToggleSelection}
              className={`w-full sm:w-auto mt-3 sm:mt-0 px-4 py-2 border rounded-md font-medium ${
                isSelected
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              {isSelected ? 'Remove from Batch' : 'Add to Batch'}
            </button>
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
