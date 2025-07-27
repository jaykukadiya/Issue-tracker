import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ApiService from '../../services/api';
import { 
  Plus, 
  Search, 
  AlertCircle, 
  Clock, 
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import IssueCard from '../issues/IssueCard';
import KanbanBoard from '../issues/KanbanBoard';
import { websocketNotificationService } from '../../services/websocketNotifications';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    team_id: '',
  });
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
  });
  const [highlightedIssueId, setHighlightedIssueId] = useState(null);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const handleIssueAssigned = (data) => {
      console.log('Dashboard: Received issue_assigned event', data);
      toast.success(`You've been assigned to: ${data.issue.title}`,
        {
          duration: 5000,
          icon: '📋',
          position: 'top-right',
        }
      );
      // Highlight the issue card
      setHighlightedIssueId(data.issue.id);
      setTimeout(() => setHighlightedIssueId(null), 5000);
    };

    const handleKanbanUpdate = (data) => {
      console.log('Dashboard: Received kanban_update event', data);
      const { issue, action } = data;

      setIssues(prevIssues => {
        let updatedIssues;
        const existingIndex = prevIssues.findIndex(i => i.id === issue.id);

        if (action === 'deleted') {
          updatedIssues = prevIssues.filter(i => i.id !== issue.id);
        } else if (existingIndex >= 0) {
          updatedIssues = prevIssues.map(i => i.id === issue.id ? issue : i);
        } else {
          updatedIssues = [issue, ...prevIssues];
        }
        return updatedIssues;
      });
    };

    websocketNotificationService.addEventListener('issue_assigned', handleIssueAssigned);
    websocketNotificationService.addEventListener('kanban_update', handleKanbanUpdate);

    return () => {
      websocketNotificationService.removeEventListener('issue_assigned', handleIssueAssigned);
      websocketNotificationService.removeEventListener('kanban_update', handleKanbanUpdate);
    };
  }, []);

  useEffect(() => {
    console.log('Dashboard: location.state:', location.state);
    
    if (location.state?.highlightIssueId) {
      console.log('Dashboard: Setting highlighted issue ID:', location.state.highlightIssueId);
      setHighlightedIssueId(location.state.highlightIssueId);
      
      // Set view mode from navigation state
      if (location.state.viewMode) {
        console.log('Dashboard: Setting view mode:', location.state.viewMode);
        setViewMode(location.state.viewMode);
      }
      
      // Clear highlighting after 3 seconds
      const timer = setTimeout(() => {
        console.log('Dashboard: Clearing highlighted issue ID');
        setHighlightedIssueId(null);
      }, 3000);
      
      // Clear the navigation state to prevent re-highlighting on refresh
      window.history.replaceState({}, document.title);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const fetchIssues = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiService.getIssues(filters);
      setIssues(response.issues || []);
      
      // Calculate stats
      const total = response.issues?.length || 0;
      const open = response.issues?.filter(issue => issue.status === 'OPEN').length || 0;
      const inProgress = response.issues?.filter(issue => issue.status === 'IN_PROGRESS').length || 0;
      const closed = response.issues?.filter(issue => issue.status === 'CLOSED').length || 0;
      
      setStats({ total, open, inProgress, closed });
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast.error('Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchIssues();
    fetchTeams();
  }, [fetchIssues]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues, filters]);



  const fetchTeams = async () => {
    try {
      const response = await ApiService.request('/teams');
      setTeams(response.teams || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleIssueUpdate = async (issueId, updateData) => {
    try {
      await ApiService.updateIssue(issueId, updateData);
      toast.success('Issue updated successfully');
      fetchIssues();
    } catch (error) {
      toast.error('Failed to update issue');
      console.error('Error updating issue:', error);
    }
  };

  const handleIssueDelete = async (issueId) => {
    if (window.confirm('Are you sure you want to delete this issue?')) {
      try {
        await ApiService.deleteIssue(issueId);
        toast.success('Issue deleted successfully');
        fetchIssues();
      } catch (error) {
        toast.error('Failed to delete issue');
        console.error('Error deleting issue:', error);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {user?.full_name || user?.username}! Here's what's happening with your projects.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Issues</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Open</p>
              <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-warning-100 rounded-lg">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-success-100 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Closed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search issues..."
              className="pl-10 input-field w-64"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <select
            className="input-field w-auto"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            className="input-field w-auto"
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          <select
            className="input-field w-auto"
            value={filters.team_id}
            onChange={(e) => handleFilterChange('team_id', e.target.value)}
          >
            <option value="">All Teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
          </div>

          <Link to="/issues/new" className="btn-primary flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>New Issue</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {viewMode === 'kanban' ? (
            <KanbanBoard
              issues={issues}
              onIssueUpdate={handleIssueUpdate}
              onIssueDelete={handleIssueDelete}
              highlightedIssueId={highlightedIssueId}
            />
          ) : (
            <div className="space-y-4">
              {issues.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No issues found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by creating a new issue.
                  </p>
                  <div className="mt-6">
                    <Link to="/issues/new" className="btn-primary">
                      <Plus className="h-4 w-4 mr-2" />
                      New Issue
                    </Link>
                  </div>
                </div>
              ) : (
                issues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onUpdate={handleIssueUpdate}
                    onDelete={handleIssueDelete}
                    isHighlighted={highlightedIssueId === issue.id}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
