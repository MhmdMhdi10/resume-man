import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileApi, resumeApi } from '../services/api';
import type { Profile } from '../store/slices/profileSlice';

interface Template {
  id: string;
  name: string;
  description: string;
  style: string;
}

export default function ResumeBuilderPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [sections, setSections] = useState({
    personalInfo: true,
    summary: true,
    workExperience: true,
    education: true,
    skills: true,
  });

  const [selectedExperiences, setSelectedExperiences] = useState<string[]>([]);
  const [selectedEducation, setSelectedEducation] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [resumeName, setResumeName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profileRes, templatesRes] = await Promise.all([
        profileApi.getProfile(),
        resumeApi.getTemplates(),
      ]);
      
      const profileData = profileRes.data.data || profileRes.data;
      const templatesData = templatesRes.data.data || templatesRes.data || [];
      
      setProfile(profileData);
      setTemplates(templatesData);
      
      if (templatesData.length > 0) {
        setSelectedTemplate(templatesData[0].id);
      }

      // Pre-select all items
      if (profileData) {
        setSelectedExperiences((profileData.workExperience || []).map((e: any) => e.id));
        setSelectedEducation((profileData.education || []).map((e: any) => e.id));
        setSelectedSkills((profileData.skills || []).map((s: any) => s.id));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    if (!resumeName.trim()) {
      setError('Please enter a name for your resume');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      await resumeApi.generateResume({
        templateId: selectedTemplate,
        name: resumeName,
        includeSections: sections,
        selectedExperiences: sections.workExperience ? selectedExperiences : [],
        selectedEducation: sections.education ? selectedEducation : [],
        selectedSkills: sections.skills ? selectedSkills : [],
      });

      navigate('/resumes');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate resume');
    } finally {
      setGenerating(false);
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
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Resume</h1>

        {error && (
          <div className="mb-4 bg-red-50 p-4 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Resume Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resume Name
          </label>
          <input
            type="text"
            value={resumeName}
            onChange={(e) => setResumeName(e.target.value)}
            placeholder="e.g., Software Engineer Resume"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        {/* Template Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Template
          </label>
          <div className="grid grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedTemplate === template.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="h-32 bg-gray-100 rounded mb-3 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">{template.style}</span>
                </div>
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-sm text-gray-500">{template.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Include Sections
          </label>
          <div className="space-y-2">
            {Object.entries(sections).map(([key, value]) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setSections({ ...sections, [key]: e.target.checked })}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Work Experience Selection */}
        {sections.workExperience && profile && profile.workExperience.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Work Experience
            </label>
            <div className="space-y-2">
              {profile.workExperience.map((exp) => (
                <label key={exp.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedExperiences.includes(exp.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedExperiences([...selectedExperiences, exp.id]);
                      } else {
                        setSelectedExperiences(selectedExperiences.filter((id) => id !== exp.id));
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <span className="text-sm">
                    {exp.role} at {exp.company}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Education Selection */}
        {sections.education && profile && profile.education.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Education
            </label>
            <div className="space-y-2">
              {profile.education.map((edu) => (
                <label key={edu.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedEducation.includes(edu.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEducation([...selectedEducation, edu.id]);
                      } else {
                        setSelectedEducation(selectedEducation.filter((id) => id !== edu.id));
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-600"
                  />
                  <span className="text-sm">
                    {edu.degree} at {edu.institution}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Skills Selection */}
        {sections.skills && profile && profile.skills.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Skills
            </label>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <label
                  key={skill.id}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm cursor-pointer ${
                    selectedSkills.includes(skill.id)
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSkills.includes(skill.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSkills([...selectedSkills, skill.id]);
                      } else {
                        setSelectedSkills(selectedSkills.filter((id) => id !== skill.id));
                      }
                    }}
                    className="sr-only"
                  />
                  {skill.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? 'Generating...' : 'Generate Resume'}
          </button>
        </div>
      </div>
    </div>
  );
}
