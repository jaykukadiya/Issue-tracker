import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Edit, 
  Trash2, 
  User, 
  Calendar, 
  Tag,
  MoreHorizontal,
  AlertCircle,
  Clock,
  CheckCircle2
} from 'lucide-react';
import MarkdownRenderer from '../common/MarkdownRenderer';

const IssueCard = ({ issue, onUpdate, onDelete, isHighlighted = false }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Debug highlighting
  if (isHighlighted) {
    console.log('IssueCard: Issue is highlighted:', issue.id, issue.title);
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'OPEN':
        return <AlertCircle className="h-4 w-4" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4" />;
      case 'CLOSED':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'OPEN':
        return 'status-badge status-open';
      case 'IN_PROGRESS':
        return 'status-badge status-in-progress';
      case 'CLOSED':
        return 'status-badge status-closed';
      default:
        return 'status-badge status-open';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'LOW':
        return 'status-badge priority-low';
      case 'MEDIUM':
        return 'status-badge priority-medium';
      case 'HIGH':
        return 'status-badge priority-high';
      case 'URGENT':
        return 'status-badge priority-urgent';
      default:
        return 'status-badge priority-medium';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleStatusChange = (newStatus) => {
    onUpdate(issue.id, { status: newStatus });
    setDropdownOpen(false);
  };

  return (
    <div className={`card p-6 hover:shadow-lg transition-all duration-200 ${
      isHighlighted 
        ? 'ring-4 ring-blue-500 ring-opacity-50 bg-blue-50 border-blue-300 animate-pulse' 
        : ''
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <Link
              to={`/issues/${issue.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
            >
              {issue.title}
            </Link>
            <div className={getStatusClass(issue.status)}>
              {getStatusIcon(issue.status)}
              <span className="ml-1">{issue.status.replace('_', ' ')}</span>
            </div>
            {issue.priority && (
              <div className={getPriorityClass(issue.priority)}>
                {issue.priority}
              </div>
            )}
          </div>

          <div className="mb-4">
            <MarkdownRenderer 
              content={issue.description} 
              truncate="short"
              className="text-gray-600"
            />
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(issue.created_at)}</span>
            </div>
            {issue.assigned_to && (
              <div className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span>Assigned</span>
              </div>
            )}
            {issue.tags && issue.tags.length > 0 && (
              <div className="flex items-center space-x-1">
                <Tag className="h-4 w-4" />
                <span>{issue.tags.join(', ')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative ml-4">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                Change Status
              </div>
              <button
                onClick={() => handleStatusChange('OPEN')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Open
              </button>
              <button
                onClick={() => handleStatusChange('IN_PROGRESS')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Clock className="h-4 w-4 mr-2" />
                In Progress
              </button>
              <button
                onClick={() => handleStatusChange('CLOSED')}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Closed
              </button>
              
              <div className="border-t border-gray-100 mt-1 pt-1">
                <Link
                  to={`/issues/${issue.id}/edit`}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
                <button
                  onClick={() => {
                    onDelete(issue.id);
                    setDropdownOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueCard;
