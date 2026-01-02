import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../hooks';
import { resumeApi, jobApi, applicationApi } from '../services/api';
import { clearJobSelection, JobListing } from '../store/slices/jobsSlice';
import {
  setCurrentBatch,
  setSubmitting,
  setError,
  clearBatch,
  BatchSubmitResult,
} from '../store/slices/applicationsSlice';

interface Resume {
  id: string;
  name: string;
  templateId: string;
  createdAt: string;
}

type Step = 'select-resume' | 'confirm-jobs' | 'submitting' | 'complete';

export default function ApplyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentBatch, submitting, error } = useAppSelector((state) => state.applications);

  const [step, setStep] = useState<Step>('select-resume');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [coverLetter, setCoverLetter] = useState('');
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Get job IDs from navigation state
  const jobIds: string[] = location.state?.jobIds || [];

  useEffect(() => {
    if (jobIds.length === 0) {
      navigate('/jobs');
      return;
    }

    loadResumes();
    loadJobs();
  }, [jobIds, navigate]);

  const loadResumes = async () => {
    setLoadingResumes(true);
    try {
      const response = await resumeApi.getResumes(1, 100);
      setResumes(response.data.resumes || response.data || []);
    } catch (err) {
      console.error('Failed to load resumes:', err);
    } finally {
      setLoadingResumes(false);
    }
  };

  const loadJobs = async () => {
    setLoadingJobs(true);
    try {
      const jobPromises = jobIds.map((id) => jobApi.getJob(id));
      const responses = await Promise.all(jobPromises);
      setJobs(responses.map((r) => r.data));
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleResumeSelect = (resumeId: string) => {
    setSelectedResumeId(resumeId);
  };

  const handleContinueToConfirm = () => {
    if (!selectedResumeId) return;
    setStep('confirm-jobs');
  };

  const handleBackToResume = () => {
    setStep('select-resume');
  };

  const handleSubmitBatch = async () => {
    if (!selectedResumeId || jobIds.length === 0) return;

    setStep('submitting');
    dispatch(setSubmitting(true));
    dispatch(setError(null));

    try {
      const response = await applicationApi.submitBatch({
        resumeId: selectedResumeId,
        jobIds,
        coverLetter: coverLetter || undefined,
      });
      dispatch(setCurrentBatch(response.data as BatchSubmitResult));
      dispatch(clearJobSelection());
      setStep('complete');
    } catch (err: any) {
      dispatch(setError(err.response?.data?.message || 'Failed to submit applications'));
      setStep('confirm-jobs');
    } finally {
      dispatch(setSubmitting(false));
    }
  };

  const handleDone = () => {
    dispatch(clearBatch());
    navigate('/dashboard');
  };

  const handleApplyMore = () => {
    dispatch(clearBatch());
    navigate('/jobs');
  };

  if (jobIds.length === 0) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        <StepIndicator
          number={1}
          label="Select Resume"
          active={step === 'select-resume'}
          completed={step !== 'select-resume'}
        />
        <div className="w-12 h-0.5 bg-gray-300" />
        <StepIndicator
          number={2}
          label="Confirm Jobs"
          active={step === 'confirm-jobs'}
          completed={step === 'submitting' || step === 'complete'}
        />
        <div className="w-12 h-0.5 bg-gray-300" />
        <StepIndicator
          number={3}
          label="Complete"
          active={step === 'complete'}
          completed={false}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Step 1: Select Resume */}
      {step === 'select-resume' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select a Resume</h2>
          <p className="text-gray-600 mb-6">
            Choose which resume you want to use for these {jobIds.length} job application
            {jobIds.length !== 1 ? 's' : ''}.
          </p>

          {loadingResumes ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : resumes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">You don't have any saved resumes yet.</p>
              <Link
                to="/builder"
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Create a resume first →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {resumes.map((resume) => (
                <label
                  key={resume.id}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedResumeId === resume.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="resume"
                    value={resume.id}
                    checked={selectedResumeId === resume.id}
                    onChange={() => handleResumeSelect(resume.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-gray-900">{resume.name}</p>
                    <p className="text-sm text-gray-500">
                      Template: {resume.templateId} • Created:{' '}
                      {new Date(resume.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Cover Letter (Optional) */}
          <div className="mt-6">
            <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-2">
              Cover Letter (Optional)
            </label>
            <textarea
              id="coverLetter"
              rows={4}
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Add a cover letter to include with your applications..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => navigate('/jobs')}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleContinueToConfirm}
              disabled={!selectedResumeId}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Confirm Jobs */}
      {step === 'confirm-jobs' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Confirm Applications</h2>
          <p className="text-gray-600 mb-6">
            You're about to apply to {jobs.length} job{jobs.length !== 1 ? 's' : ''} with your
            selected resume.
          </p>

          {/* Selected Resume Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Resume</h3>
            <p className="font-medium text-gray-900">
              {resumes.find((r) => r.id === selectedResumeId)?.name}
            </p>
          </div>

          {/* Jobs List */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Jobs to Apply</h3>
            {loadingJobs ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{job.title}</p>
                      <p className="text-sm text-gray-500">
                        {job.company} • {job.location}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={handleBackToResume}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Back
            </button>
            <button
              onClick={handleSubmitBatch}
              disabled={submitting}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : `Submit ${jobs.length} Application${jobs.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Submitting */}
      {step === 'submitting' && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Submitting Applications</h2>
          <p className="text-gray-600">
            Please wait while we queue your applications...
          </p>
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && currentBatch && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Applications Queued!</h2>
            <p className="text-gray-600">
              {currentBatch.totalCount} application{currentBatch.totalCount !== 1 ? 's have' : ' has'}{' '}
              been added to the queue.
            </p>
          </div>

          {/* Queue Status */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Queue Status</h3>
            <div className="space-y-2">
              {currentBatch.applications.map((app) => {
                const job = jobs.find((j) => j.id === app.jobId);
                return (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-2 bg-white rounded border"
                  >
                    <span className="text-sm text-gray-900">
                      {job?.title || 'Job'} at {job?.company || 'Company'}
                    </span>
                    <StatusBadge status={app.status} />
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-gray-500 text-center mb-6">
            Your applications will be processed automatically. You can track their status on the
            dashboard.
          </p>

          <div className="flex justify-center space-x-4">
            <button
              onClick={handleApplyMore}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Apply to More Jobs
            </button>
            <button
              onClick={handleDone}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// Step Indicator Component
interface StepIndicatorProps {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}

function StepIndicator({ number, label, active, completed }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          completed
            ? 'bg-indigo-600 text-white'
            : active
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-200 text-gray-600'
        }`}
      >
        {completed ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          number
        )}
      </div>
      <span
        className={`mt-1 text-xs ${active || completed ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}
      >
        {label}
      </span>
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
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusStyles()}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
