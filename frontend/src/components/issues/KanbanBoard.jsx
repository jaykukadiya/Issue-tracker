import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Plus,
  User,
  Calendar,
  Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import MarkdownRenderer from '../common/MarkdownRenderer';

const KanbanBoard = ({ issues, onIssueUpdate, onIssueDelete, highlightedIssueId = null }) => {
  const columns = {
    OPEN: {
      id: 'OPEN',
      title: 'Open',
      icon: AlertCircle,
      color: 'blue',
      issues: issues.filter(issue => issue.status === 'OPEN'),
    },
    IN_PROGRESS: {
      id: 'IN_PROGRESS',
      title: 'In Progress',
      icon: Clock,
      color: 'yellow',
      issues: issues.filter(issue => issue.status === 'IN_PROGRESS'),
    },
    CLOSED: {
      id: 'CLOSED',
      title: 'Closed',
      icon: CheckCircle2,
      color: 'green',
      issues: issues.filter(issue => issue.status === 'CLOSED'),
    },
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const issueId = draggableId;
    const newStatus = destination.droppableId;

    onIssueUpdate(issueId, { status: newStatus });
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800';
      case 'HIGH':
        return 'bg-yellow-100 text-yellow-800';
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const IssueCard = ({ issue, index }) => {
    const isHighlighted = highlightedIssueId === issue.id;
    
    return (
      <Draggable draggableId={issue.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`card p-4 mb-3 cursor-pointer transition-all duration-200 ${
              snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
            } ${
              isHighlighted 
                ? 'ring-4 ring-blue-500 ring-opacity-50 bg-blue-50 border-blue-300 animate-pulse' 
                : ''
            }`}
        >
          <div className="flex items-start justify-between mb-2">
            <Link
              to={`/issues/${issue.id}/edit`}
              className="text-sm font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-2"
            >
              {issue.title}
            </Link>
            {issue.priority && (
              <span className={`status-badge ${getPriorityClass(issue.priority)} ml-2 flex-shrink-0`}>
                {issue.priority}
              </span>
            )}
          </div>

          <div className="mb-3">
            <MarkdownRenderer 
              content={issue.description} 
              truncate={true}
              className="text-xs text-gray-600"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(issue.created_at)}</span>
              </div>
              {issue.assigned_to && (
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                </div>
              )}
            </div>
            {issue.tags && issue.tags.length > 0 && (
              <div className="flex items-center space-x-1">
                <Tag className="h-3 w-3" />
                <span className="truncate max-w-20">{issue.tags[0]}</span>
                {issue.tags.length > 1 && <span>+{issue.tags.length - 1}</span>}
              </div>
            )}
          </div>
        </div>
        )}
      </Draggable>
    );
  };

  const Column = ({ column }) => {
    const IconComponent = column.icon;
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200',
      yellow: 'bg-yellow-50 border-yellow-200',
      green: 'bg-green-50 border-green-200',
    };

    return (
      <div className={`rounded-lg border-2 border-dashed ${colorClasses[column.color]} p-4`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <IconComponent className={`h-5 w-5 text-${column.color}-600`} />
            <h3 className="font-semibold text-gray-900">{column.title}</h3>
            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
              {column.issues.length}
            </span>
          </div>
          <Link
            to="/issues/new"
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>

        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`min-h-96 transition-colors duration-200 ${
                snapshot.isDraggingOver ? 'bg-gray-50 rounded-lg' : ''
              }`}
            >
              {column.issues.map((issue, index) => (
                <IssueCard key={issue.id} issue={issue} index={index} />
              ))}
              {provided.placeholder}
              
              {column.issues.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <IconComponent className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No {column.title.toLowerCase()} issues</p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.values(columns).map((column) => (
          <Column key={column.id} column={column} />
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
