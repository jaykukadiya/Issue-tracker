import React, { useState, useEffect } from 'react';
import ApiService from '../../services/api';
import { 
  Plus,
  Users, 
  Edit,
  X,
  Search,
  Calendar,
  Crown
} from 'lucide-react';
import toast from 'react-hot-toast';

const TeamManagement = () => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: ''
  });
  const [addMemberForm, setAddMemberForm] = useState({
    username: '',
    role: 'member'
  });
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await ApiService.request('/teams');
      setTeams(response.teams || []);
    } catch (error) {
      toast.error('Failed to fetch teams');
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    
    try {
      await ApiService.request('/teams', {
        method: 'POST',
        body: JSON.stringify(createForm)
      });
      
      toast.success('Team created successfully!');
      setCreateForm({ name: '', description: '' });
      setShowCreateModal(false);
      fetchTeams();
    } catch (error) {
      toast.error(error.message || 'Failed to create team');
    }
  };

  const handleEditTeam = (team) => {
    setSelectedTeam(team);
    setShowEditModal(true);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedTeam) return;
    
    try {
      setAddMemberLoading(true);
      await ApiService.request(`/teams/${selectedTeam.id}/members`, {
        method: 'POST',
        body: JSON.stringify(addMemberForm)
      });
      
      toast.success('Member added successfully!');
      setAddMemberForm({ username: '', role: 'member' });
      fetchTeams();
    } catch (error) {
      toast.error(error.message || 'Failed to add member');
    } finally {
      setAddMemberLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-600 mt-2">Manage your teams and members</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Create Team</span>
        </button>
      </div>

      {/* Teams List */}
      <div className="card p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Users className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Your Teams</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No teams yet</h3>
            <p className="text-gray-600">Create your first team to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Your Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{team.name}</div>
                        {team.description && (
                          <div className="text-sm text-gray-500">{team.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {team.member_count || team.members?.length || 0} members
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        team.user_role === 'admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {team.user_role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                        {team.user_role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {new Date(team.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {team.user_role === 'admin' && (
                        <button
                          onClick={() => handleEditTeam(team)}
                          className="text-primary-600 hover:text-primary-900 flex items-center space-x-1"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Team</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Enter team name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Enter team description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && selectedTeam && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Member to {selectedTeam.name}</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Search className="h-4 w-4 inline mr-2" />
                  Username
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Enter username"
                  value={addMemberForm.username}
                  onChange={(e) => setAddMemberForm({ ...addMemberForm, username: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  className="input-field"
                  value={addMemberForm.role}
                  onChange={(e) => setAddMemberForm({ ...addMemberForm, role: e.target.value })}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={addMemberLoading}
                  className={`btn-primary ${addMemberLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {addMemberLoading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
