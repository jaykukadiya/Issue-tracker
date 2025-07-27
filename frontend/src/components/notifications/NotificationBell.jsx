import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Handle clicks outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Subscribe to notification updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = notificationService.addListener(({ notifications, unreadCount }) => {
      setNotifications(notifications);
      setUnreadCount(unreadCount);
    });

    // Initial fetch
    const fetchInitialNotifications = async () => {
      try {
        setLoading(true);
        await notificationService.fetchNotifications(1, 10);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialNotifications();

    notificationService.requestNotificationPermission();

    return () => {
      unsubscribe();
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      await notificationService.fetchNotifications(1, 10);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (notification) => {
    console.log('NotificationBell: Clicked notification:', notification);
    
    if (!notification.is_read) {
      try {
        await notificationService.markAsRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Close the notification dropdown
    setIsOpen(false);

    // Navigate to dashboard with highlighted issue
    if (notification.issue_id) {
      console.log('NotificationBell: Navigating to dashboard with issue ID:', notification.issue_id);
      navigate('/dashboard', { 
        state: { 
          highlightIssueId: notification.issue_id,
          viewMode: 'list' // Force list view for better highlighting visibility
        } 
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationTypeColor = (type) => {
    const colors = {
      'ISSUE_ASSIGNED': 'bg-blue-100 text-blue-800',
      'ISSUE_UPDATED': 'bg-yellow-100 text-yellow-800',
      'ISSUE_STATUS_CHANGED': 'bg-green-100 text-green-800',
      'ISSUE_COMMENT': 'bg-purple-100 text-purple-800',
      'TEAM_INVITE': 'bg-indigo-100 text-indigo-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-primary-600 transition-colors rounded-lg hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  You'll see notifications here when issues are assigned to you or updated.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Notification Icon */}
                      <div className="flex-shrink-0">
                        <span className="text-lg">
                          {notificationService.getNotificationIcon(notification.type)}
                        </span>
                      </div>

                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getNotificationTypeColor(notification.type)}`}>
                            {notification.type.replace('_', ' ').toLowerCase()}
                          </span>
                          <span className="text-xs text-gray-400">
                            {notificationService.formatNotificationTime(notification.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Navigate to full notifications page if you create one
                  // window.location.href = '/notifications';
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
