import apiService from './api';

class NotificationService {
  constructor() {
    this.listeners = new Set();
    this.notifications = [];
    this.unreadCount = 0;

  }

  // Add listener for notification updates
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback({
          notifications: this.notifications,
          unreadCount: this.unreadCount
        });
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Fetch notifications from API
  async fetchNotifications(page = 1, size = 20, unreadOnly = false) {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
        unread_only: unreadOnly.toString()
      });

      const response = await apiService.request(`/notifications?${params}`);
      
      if (page === 1) {
        this.notifications = response.notifications;
      } else {
        this.notifications = [...this.notifications, ...response.notifications];
      }
      
      this.unreadCount = response.unread_count;
      this.notifyListeners();
      
      return response;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Get unread count
  async fetchUnreadCount() {
    try {
      const response = await apiService.request('/notifications/unread-count');
      this.unreadCount = response.unread_count;
      this.notifyListeners();
      return response.unread_count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      await apiService.request(`/notifications/${notificationId}/read`, {
        method: 'PUT'
      });

      // Update local state
      this.notifications = this.notifications.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true }
          : notif
      );
      
      this.unreadCount = Math.max(0, this.unreadCount - 1);
      this.notifyListeners();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead() {
    try {
      await apiService.request('/notifications/read-all', {
        method: 'PUT'
      });

      // Update local state
      this.notifications = this.notifications.map(notif => ({
        ...notif,
        is_read: true
      }));
      
      this.unreadCount = 0;
      this.notifyListeners();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Show browser notification
  showBrowserNotification(notification) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      });
    }
  }

  // Request notification permission
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }

  // Get notification icon based on type
  getNotificationIcon(type) {
    const icons = {
      'ISSUE_ASSIGNED': '👤',
      'ISSUE_UPDATED': '✏️',
      'ISSUE_STATUS_CHANGED': '🔄',
      'ISSUE_COMMENT': '💬',
      'TEAM_INVITE': '👥'
    };
    return icons[type] || '📢';
  }

  // Format notification time
  formatNotificationTime(createdAt) {
    const now = new Date();
    const notifTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now - notifTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }
}

const notificationServiceInstance = new NotificationService();
export default notificationServiceInstance;
