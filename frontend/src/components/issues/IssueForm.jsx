import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApiService from '../../services/api';
import { 
  Save, 
  X, 
  Sparkles, 
  Loader2,
  ArrowLeft,
  Tag,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';

const IssueForm = ({ mode = 'create' }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM',
    tags: [],
    assigned_to: '',
    team_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [originalDescription, setOriginalDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = mode === 'edit' && id;

  const fetchIssue = useCallback(async () => {
    try {
      const issue = await ApiService.getIssue(id);
      setFormData({
        title: issue.title || '',
        description: issue.description || '',
        status: issue.status || 'OPEN',
        priority: issue.priority || 'MEDIUM',
        tags: issue.tags || [],
        assigned_to: issue.assigned_to || '',
        team_id: issue.team_id || '',
      });
      setOriginalDescription(issue.description || '');
    } catch (error) {
      toast.error('Failed to fetch issue');
      navigate('/dashboard');
    }
  }, [id, navigate]);

  useEffect(() => {
    const loadData = async () => {
      if (isEdit) {
        await fetchIssue();
      }
      await fetchTeams();
    };
    loadData();
  }, [isEdit, id, fetchIssue]);

  // Fetch team members when team is selected
  useEffect(() => {
    if (formData.team_id) {
      fetchTeamMembers(formData.team_id);
    } else {
      setTeamMembers([]);
    }
  }, [formData.team_id]);

  const fetchTeams = async () => {
    try {
      const response = await ApiService.request('/teams');
      setTeams(response.teams || []);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const fetchTeamMembers = async (teamId) => {
    try {
      const response = await ApiService.request(`/teams/${teamId}/members`);
      console.log('Team members API response:', response);
      console.log('Team members users:', response.users);
      
      // Ensure each member has an id field (map _id to id if needed)
      const members = (response.users || []).map(member => ({
        ...member,
        id: member.id || member._id // Use id if exists, otherwise use _id
      }));
      
      console.log('Processed team members:', members);
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      setTeamMembers([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTagAdd = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!formData.tags.includes(newTag)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag],
        }));
      }
      setTagInput('');
    }
  };

  const handleTagRemove = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleEnhanceDescription = async () => {
    if (!formData.description.trim()) {
      toast.error('Please enter a description first');
      return;
    }

    setEnhancing(true);
    try {
      const response = await ApiService.enhanceDescription(formData.description);
      setOriginalDescription(formData.description);
      setFormData(prev => ({
        ...prev,
        description: response.enhanced_description,
      }));
      toast.success('Description enhanced with AI!');
    } catch (error) {
      toast.error('Failed to enhance description');
    } finally {
      setEnhancing(false);
    }
  };

  const handleRevertDescription = () => {
    setFormData(prev => ({
      ...prev,
      description: originalDescription,
    }));
    toast.success('Description reverted to original');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Debug logs
      console.log('Form data before processing:', formData);
      console.log('Team members:', teamMembers);
      console.log('Selected assigned_to:', formData.assigned_to);
      
      const submitData = {
        ...formData,
        assigned_to: formData.assigned_to && formData.assigned_to !== '' ? formData.assigned_to : null,
      };

      // Debug log to check the data being sent
      console.log('Submitting issue data:', submitData);

      if (isEdit) {
        await ApiService.updateIssue(id, submitData);
        toast.success('Issue updated successfully!');
      } else {
        await ApiService.createIssue(submitData, false); // Don't auto-enhance since we have manual enhance
        toast.success('Issue created successfully!');
      }
      
      navigate('/dashboard');
    } catch (error) {
      toast.error(isEdit ? 'Failed to update issue' : 'Failed to create issue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900">
          {isEdit ? 'Edit Issue' : 'Create New Issue'}
        </h1>
        <p className="mt-2 text-gray-600">
          {isEdit ? 'Update the issue details below.' : 'Fill in the details to create a new issue.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          {/* Title */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              className="input-field"
              placeholder="Enter a descriptive title for the issue"
              value={formData.title}
              onChange={handleChange}
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description *
              </label>
              <div className="flex space-x-2">
                {originalDescription && formData.description !== originalDescription && (
                  <button
                    type="button"
                    onClick={handleRevertDescription}
                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Revert to original
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleEnhanceDescription}
                  disabled={enhancing || !formData.description.trim()}
                  className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700 transition-colors disabled:opacity-50"
                >
                  {enhancing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  <span>{enhancing ? 'Enhancing...' : 'Enhance with AI'}</span>
                </button>
              </div>
            </div>
            <textarea
              id="description"
              name="description"
              required
              rows={6}
              className="input-field resize-none"
              placeholder="Describe the issue in detail..."
              value={formData.description}
              onChange={handleChange}
            />
            <p className="mt-1 text-xs text-gray-500">
              Use the AI enhancement to make your description more professional and detailed.
            </p>
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                className="input-field"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                className="input-field"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Team Selection */}
          <div className="mb-6">
            <label htmlFor="team_id" className="block text-sm font-medium text-gray-700 mb-2">
              Team *
            </label>
            <select
              id="team_id"
              name="team_id"
              required
              className="input-field"
              value={formData.team_id}
              onChange={handleChange}
            >
              <option value="">Select a team</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To */}
          <div className="mb-6">
            <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-1" />
              Assign To
            </label>
            <select
              id="assigned_to"
              name="assigned_to"
              className="input-field"
              value={formData.assigned_to}
              onChange={handleChange}
            >
              <option value="">Unassigned</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name || member.username} ({member.email})
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="h-4 w-4 inline mr-1" />
              Tags
            </label>
            <input
              type="text"
              id="tags"
              className="input-field"
              placeholder="Type a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagAdd}
            />
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleTagRemove(tag)}
                      className="ml-1 text-primary-600 hover:text-primary-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{loading ? 'Saving...' : (isEdit ? 'Update Issue' : 'Create Issue')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default IssueForm;
