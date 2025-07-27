import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, AlertCircle } from 'lucide-react';
import IssueCard from './IssueCard';
import ApiService from '../../services/api';

import toast from 'react-hot-toast';

const IssuesPage = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    assigned_to: ''
  });

  useEffect(() => {
    const loadIssues = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getIssues(filters);
        setIssues(response.issues || []);
      } catch (error) {
        toast.error('Failed to fetch issues');
        console.error('Error fetching issues:', error);
      } finally {
        setLoading(false);
      }
    };
    loadIssues();
  }, [filters]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getIssues(filters);
      setIssues(response.issues || []);
    } catch (error) {
      toast.error('Failed to fetch issues');
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleIssueUpdate = async (issueId, updates) => {
    try {
      await ApiService.updateIssue(issueId, updates);
      toast.success('Issue updated successfully!');
      fetchIssues();
    } catch (error) {
      toast.error('Failed to update issue');
      console.error('Error updating issue:', error);
    }
  };

  const handleIssueDelete = async (issueId) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) {
      return;
    }

    try {
      await ApiService.deleteIssue(issueId);
      toast.success('Issue deleted successfully!');
      fetchIssues();
    } catch (error) {
      toast.error('Failed to delete issue');
      console.error('Error deleting issue:', error);
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      assigned_to: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">All Issues</h1>
          <p className="text-gray-600 mt-1">
            Manage and track all your issues in one place
          </p>
        </div>
        <Link to="/issues/new" className="btn-primary flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Issue</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search issues by title or description..."
                className="pl-10 input-field w-full"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-auto">
            <select
              className="input-field w-full lg:w-auto"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="w-full lg:w-auto">
            <select
              className="input-field w-full lg:w-auto"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            >
              <option value="">All Priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="btn-secondary flex items-center space-x-2 whitespace-nowrap"
            >
              <Filter className="h-4 w-4" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">Active filters:</span>
              {filters.search && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{filters.search}"
                </span>
              )}
              {filters.status && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Status: {filters.status.replace('_', ' ')}
                </span>
              )}
              {filters.priority && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Priority: {filters.priority}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {hasActiveFilters ? 'No issues match your filters' : 'No issues found'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters 
                  ? 'Try adjusting your search criteria or clear the filters.'
                  : 'Get started by creating your first issue.'
                }
              </p>
              <div className="mt-6">
                {hasActiveFilters ? (
                  <button onClick={clearFilters} className="btn-secondary mr-3">
                    Clear Filters
                  </button>
                ) : null}
                <Link to="/issues/new" className="btn-primary">
                  <Plus className="h-4 w-4 mr-2" />
                  New Issue
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Results Count */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {issues.length} issue{issues.length !== 1 ? 's' : ''}
                  {hasActiveFilters ? ' (filtered)' : ''}
                </p>
              </div>

              {/* Issues */}
              {issues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onUpdate={handleIssueUpdate}
                  onDelete={handleIssueDelete}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default IssuesPage;
