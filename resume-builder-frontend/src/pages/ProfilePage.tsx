import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../hooks';
import { setProfile, setLoading, setError } from '../store/slices/profileSlice';
import { profileApi, aiApi } from '../services/api';
import type { WorkExperience, Education, Skill, PersonalInfo } from '../store/slices/profileSlice';

export default function ProfilePage() {
  const { profile, loading, error } = useAppSelector((state) => state.profile);
  const dispatch = useAppDispatch();
  const [activeTab, setActiveTab] = useState<'personal' | 'experience' | 'education' | 'skills'>('personal');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    dispatch(setLoading(true));
    try {
      const response = await profileApi.getProfile();
      dispatch(setProfile(response.data));
    } catch (err: any) {
      dispatch(setError(err.response?.data?.message || 'Failed to load profile'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-700">{error}</p>
        <button onClick={fetchProfile} className="mt-2 text-indigo-600 hover:text-indigo-500">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {(['personal', 'experience', 'education', 'skills'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'personal' && (
            <PersonalInfoSection
              personalInfo={profile?.personalInfo}
              onUpdate={fetchProfile}
            />
          )}
          {activeTab === 'experience' && (
            <WorkExperienceSection
              experiences={profile?.workExperience || []}
              onUpdate={fetchProfile}
            />
          )}
          {activeTab === 'education' && (
            <EducationSection
              education={profile?.education || []}
              onUpdate={fetchProfile}
            />
          )}
          {activeTab === 'skills' && (
            <SkillsSection
              skills={profile?.skills || []}
              onUpdate={fetchProfile}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function PersonalInfoSection({ personalInfo, onUpdate }: { personalInfo?: PersonalInfo; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<PersonalInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    summary: '',
    linkedIn: '',
    website: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (personalInfo) {
      setFormData(personalInfo);
    }
  }, [personalInfo]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileApi.updatePersonalInfo(formData);
      setEditing(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to save personal info:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Personal Information</h3>
          <button
            onClick={() => setEditing(true)}
            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Name</p>
            <p className="font-medium">{personalInfo?.firstName} {personalInfo?.lastName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{personalInfo?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Phone</p>
            <p className="font-medium">{personalInfo?.phone || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">LinkedIn</p>
            <p className="font-medium">{personalInfo?.linkedIn || 'Not set'}</p>
          </div>
        </div>
        {personalInfo?.summary && (
          <div>
            <p className="text-sm text-gray-500">Summary</p>
            <p className="mt-1">{personalInfo.summary}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Edit Personal Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="First Name"
          value={formData.firstName}
          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          className="border rounded-md px-3 py-2"
        />
        <input
          type="text"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          className="border rounded-md px-3 py-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="border rounded-md px-3 py-2"
        />
        <input
          type="tel"
          placeholder="Phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="border rounded-md px-3 py-2"
        />
        <input
          type="url"
          placeholder="LinkedIn URL"
          value={formData.linkedIn || ''}
          onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
          className="border rounded-md px-3 py-2"
        />
        <input
          type="url"
          placeholder="Website"
          value={formData.website || ''}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          className="border rounded-md px-3 py-2"
        />
      </div>
      <textarea
        placeholder="Professional Summary"
        value={formData.summary || ''}
        onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
        rows={4}
        className="w-full border rounded-md px-3 py-2"
      />
      <div className="flex space-x-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function WorkExperienceSection({ experiences, onUpdate }: { experiences: WorkExperience[]; onUpdate: () => void }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [improvingAll, setImprovingAll] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    role: '',
    startDate: '',
    endDate: '',
    current: false,
    description: '',
    achievements: [''],
  });

  const resetForm = () => {
    setFormData({ company: '', role: '', startDate: '', endDate: '', current: false, description: '', achievements: [''] });
  };

  const startEdit = (exp: WorkExperience) => {
    setEditingId(exp.id);
    setFormData({
      company: exp.company,
      role: exp.role,
      startDate: exp.startDate ? new Date(exp.startDate).toISOString().split('T')[0] : '',
      endDate: exp.endDate ? new Date(exp.endDate).toISOString().split('T')[0] : '',
      current: exp.current || false,
      description: exp.description || '',
      achievements: exp.achievements?.length ? exp.achievements : [''],
    });
    setAdding(false);
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      await profileApi.addWorkExperience({
        ...formData,
        achievements: formData.achievements.filter(a => a.trim()),
      });
      setAdding(false);
      resetForm();
      onUpdate();
    } catch (err) {
      console.error('Failed to add experience:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await profileApi.updateWorkExperience(editingId, {
        ...formData,
        achievements: formData.achievements.filter(a => a.trim()),
      });
      setEditingId(null);
      resetForm();
      onUpdate();
    } catch (err) {
      console.error('Failed to update experience:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this experience?')) {
      try {
        await profileApi.deleteWorkExperience(id);
        onUpdate();
      } catch (err) {
        console.error('Failed to delete experience:', err);
      }
    }
  };

  const handleImproveAllDescriptions = async () => {
    if (experiences.length === 0) return;
    setShowAiModal(false);
    setImprovingAll(true);
    try {
      const expData = experiences.map(exp => ({
        id: exp.id,
        role: exp.role,
        company: exp.company,
        description: exp.description || '',
      }));
      const response = await aiApi.improveAllDescriptions(expData, customPrompt || undefined);
      const improved = response.data.data;
      for (const item of improved) {
        await profileApi.updateWorkExperience(item.id, { description: item.improvedDescription });
      }
      onUpdate();
      setCustomPrompt('');
    } catch (err) {
      console.error('Failed to improve descriptions:', err);
      alert('Failed to improve descriptions. Please try again.');
    } finally {
      setImprovingAll(false);
    }
  };

  const renderForm = (isEdit: boolean) => (
    <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Company"
          value={formData.company}
          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
          className="border rounded-md px-3 py-2"
        />
        <input
          type="text"
          placeholder="Role/Title"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="border rounded-md px-3 py-2"
        />
        <input
          type="date"
          placeholder="Start Date"
          value={formData.startDate}
          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          className="border rounded-md px-3 py-2"
        />
        <input
          type="date"
          placeholder="End Date"
          value={formData.endDate}
          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          disabled={formData.current}
          className="border rounded-md px-3 py-2 disabled:bg-gray-100"
        />
      </div>
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={formData.current}
          onChange={(e) => setFormData({ ...formData, current: e.target.checked, endDate: '' })}
        />
        <span className="text-sm">Currently working here</span>
      </label>
      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        rows={3}
        className="w-full border rounded-md px-3 py-2"
      />
      <div className="flex space-x-2">
        <button
          onClick={isEdit ? handleUpdate : handleAdd}
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : isEdit ? 'Update' : 'Add'}
        </button>
        <button
          onClick={() => { isEdit ? setEditingId(null) : setAdding(false); resetForm(); }}
          className="px-4 py-2 border rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* AI Prompt Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 space-y-4">
            <h3 className="text-lg font-medium">AI Improve Descriptions</h3>
            <p className="text-sm text-gray-500">
              Add any specific instructions for the AI to follow when improving your descriptions.
            </p>
            <textarea
              placeholder="e.g., Focus on leadership skills, use metrics where possible, keep it concise, target software engineering roles..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={4}
              className="w-full border rounded-md px-3 py-2"
            />
            <div className="flex space-x-2 justify-end">
              <button
                onClick={() => { setShowAiModal(false); setCustomPrompt(''); }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImproveAllDescriptions}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                ✨ Improve Descriptions
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Work Experience</h3>
        <div className="flex space-x-2">
          {experiences.length > 0 && (
            <button
              onClick={() => setShowAiModal(true)}
              disabled={improvingAll}
              className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-1"
            >
              {improvingAll ? (
                <>
                  <span className="animate-spin">⚙️</span>
                  <span>Improving...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>AI Improve Descriptions</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={() => { setAdding(true); setEditingId(null); resetForm(); }}
            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
          >
            + Add Experience
          </button>
        </div>
      </div>

      {adding && renderForm(false)}

      <div className="space-y-4">
        {experiences.map((exp) => (
          <div key={exp.id}>
            {editingId === exp.id ? (
              renderForm(true)
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-medium">{exp.role}</h4>
                    <p className="text-gray-600">{exp.company}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(exp.startDate).toLocaleDateString()} - {exp.current ? 'Present' : exp.endDate ? new Date(exp.endDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEdit(exp)}
                      className="text-indigo-600 hover:text-indigo-500 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(exp.id)}
                      className="text-red-600 hover:text-red-500 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {exp.description && <p className="mt-2 text-gray-700">{exp.description}</p>}
              </div>
            )}
          </div>
        ))}
        {experiences.length === 0 && !adding && (
          <p className="text-gray-500 text-center py-4">No work experience added yet</p>
        )}
      </div>
    </div>
  );
}

function EducationSection({ education, onUpdate }: { education: Education[]; onUpdate: () => void }) {
  const [adding, setAdding] = useState(false);
  const [newEdu, setNewEdu] = useState({
    institution: '',
    degree: '',
    field: '',
    startDate: '',
    endDate: '',
    gpa: '',
    achievements: [''],
  });

  const handleAdd = async () => {
    try {
      await profileApi.addEducation({
        ...newEdu,
        gpa: newEdu.gpa ? parseFloat(newEdu.gpa) : undefined,
        achievements: newEdu.achievements.filter(a => a.trim()),
      });
      setAdding(false);
      setNewEdu({ institution: '', degree: '', field: '', startDate: '', endDate: '', gpa: '', achievements: [''] });
      onUpdate();
    } catch (err) {
      console.error('Failed to add education:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this education?')) {
      try {
        await profileApi.deleteEducation(id);
        onUpdate();
      } catch (err) {
        console.error('Failed to delete education:', err);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Education</h3>
        <button
          onClick={() => setAdding(true)}
          className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
        >
          + Add Education
        </button>
      </div>

      {adding && (
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Institution"
              value={newEdu.institution}
              onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="text"
              placeholder="Degree"
              value={newEdu.degree}
              onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="text"
              placeholder="Field of Study"
              value={newEdu.field}
              onChange={(e) => setNewEdu({ ...newEdu, field: e.target.value })}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="number"
              step="0.01"
              placeholder="GPA (optional)"
              value={newEdu.gpa}
              onChange={(e) => setNewEdu({ ...newEdu, gpa: e.target.value })}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="date"
              placeholder="Start Date"
              value={newEdu.startDate}
              onChange={(e) => setNewEdu({ ...newEdu, startDate: e.target.value })}
              className="border rounded-md px-3 py-2"
            />
            <input
              type="date"
              placeholder="End Date"
              value={newEdu.endDate}
              onChange={(e) => setNewEdu({ ...newEdu, endDate: e.target.value })}
              className="border rounded-md px-3 py-2"
            />
          </div>
          <div className="flex space-x-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Add
            </button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 border rounded-md hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {education.map((edu) => (
          <div key={edu.id} className="border rounded-lg p-4">
            <div className="flex justify-between">
              <div>
                <h4 className="font-medium">{edu.degree} in {edu.field}</h4>
                <p className="text-gray-600">{edu.institution}</p>
                <p className="text-sm text-gray-500">
                  {new Date(edu.startDate).toLocaleDateString()} - {edu.endDate ? new Date(edu.endDate).toLocaleDateString() : 'Present'}
                  {edu.gpa && ` • GPA: ${edu.gpa}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(edu.id)}
                className="text-red-600 hover:text-red-500 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {education.length === 0 && !adding && (
          <p className="text-gray-500 text-center py-4">No education added yet</p>
        )}
      </div>
    </div>
  );
}

function SkillsSection({ skills, onUpdate }: { skills: Skill[]; onUpdate: () => void }) {
  const [adding, setAdding] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [newSkill, setNewSkill] = useState({
    name: '',
    category: 'technical' as const,
    proficiencyLevel: 'intermediate' as const,
  });

  const handleAdd = async () => {
    try {
      await profileApi.addSkill(newSkill);
      setAdding(false);
      setNewSkill({ name: '', category: 'technical', proficiencyLevel: 'intermediate' });
      onUpdate();
    } catch (err) {
      console.error('Failed to add skill:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await profileApi.deleteSkill(id);
      onUpdate();
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  const handleExtractSkills = async () => {
    setShowAiModal(false);
    setExtracting(true);
    try {
      const response = await aiApi.extractSkillsAndSave(customPrompt || undefined);
      const result = response.data.data;
      if (result.added > 0) {
        onUpdate();
      }
      alert(`AI extracted and added ${result.added} new skills!`);
      setCustomPrompt('');
    } catch (err) {
      console.error('Failed to extract skills:', err);
      alert('Failed to extract skills. Make sure you have work experiences added.');
    } finally {
      setExtracting(false);
    }
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, Skill[]>);

  return (
    <div className="space-y-4">
      {/* AI Prompt Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 space-y-4">
            <h3 className="text-lg font-medium">AI Extract Skills</h3>
            <p className="text-sm text-gray-500">
              Add any specific instructions for the AI when extracting skills from your work experiences.
            </p>
            <textarea
              placeholder="e.g., Focus on backend technologies, include DevOps tools, prioritize programming languages, extract soft skills too..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={4}
              className="w-full border rounded-md px-3 py-2"
            />
            <div className="flex space-x-2 justify-end">
              <button
                onClick={() => { setShowAiModal(false); setCustomPrompt(''); }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExtractSkills}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                🔍 Extract Skills
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Skills</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAiModal(true)}
            disabled={extracting}
            className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-1"
          >
            {extracting ? (
              <>
                <span className="animate-spin">⚙️</span>
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>AI Extract Skills</span>
              </>
            )}
          </button>
          <button
            onClick={() => setAdding(true)}
            className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
          >
            + Add Skill
          </button>
        </div>
      </div>

      {adding && (
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div className="grid grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Skill name"
              value={newSkill.name}
              onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
              className="border rounded-md px-3 py-2"
            />
            <select
              value={newSkill.category}
              onChange={(e) => setNewSkill({ ...newSkill, category: e.target.value as any })}
              className="border rounded-md px-3 py-2"
            >
              <option value="technical">Technical</option>
              <option value="soft">Soft Skills</option>
              <option value="language">Language</option>
              <option value="tool">Tool</option>
            </select>
            <select
              value={newSkill.proficiencyLevel}
              onChange={(e) => setNewSkill({ ...newSkill, proficiencyLevel: e.target.value as any })}
              className="border rounded-md px-3 py-2"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          <div className="flex space-x-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Add
            </button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 border rounded-md hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(groupedSkills).map(([category, categorySkills]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-gray-500 uppercase mb-2">{category}</h4>
            <div className="flex flex-wrap gap-2">
              {categorySkills.map((skill) => (
                <span
                  key={skill.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                >
                  {skill.name}
                  <button
                    onClick={() => handleDelete(skill.id)}
                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))}
        {skills.length === 0 && !adding && (
          <p className="text-gray-500 text-center py-4">No skills added yet</p>
        )}
      </div>
    </div>
  );
}
