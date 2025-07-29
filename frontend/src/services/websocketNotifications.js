class WebSocketNotificationService {
  constructor() {
    this.websocket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.isConnecting = false;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.isConnecting || (this.websocket && this.websocket.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      const wsUrl = `${process.env.REACT_APP_WS_BASE_URL}/ws/notifications?token=${token}`;
      this.websocket = new WebSocket(wsUrl);

      this.websocket.onopen = () => {
        console.log('WebSocket notification service connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Send ping to keep connection alive
        this.startHeartbeat();
      };

      this.websocket.onmessage = (event) => {
        try {
          // Handle plain text pong responses
          if (event.data === 'pong') {
            console.log('WebSocket: Received pong');
            return;
          }
          
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, 'Raw data:', event.data);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('WebSocket notification service disconnected');
        this.isConnecting = false;
        this.stopHeartbeat();
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(token);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.isConnecting = false;
    }
  }

  disconnect() {
    this.stopHeartbeat();
    if (this.websocket) {
      this.websocket.close(1000, 'Normal closure');
      this.websocket = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  scheduleReconnect(token) {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`Attempting to reconnect WebSocket in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect(token);
    }, delay);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        this.websocket.send('ping');
      }
    }, 30000); // Send ping every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  handleMessage(message) {
    console.log('WebSocket: Received message:', message);
    const { type, data } = message;
    
    if (type === 'notification') {
      console.log('WebSocket: Processing notification:', data);
      this.notifyListeners('notification', data);
      
      // Handle specific notification types
      switch (data.event_type) {
        case 'issue_assigned':
          console.log('WebSocket: Dispatching issue_assigned event');
          this.notifyListeners('issue_assigned', data);
          this.showAssignmentNotification(data);
          break;
        case 'kanban_update':
          console.log('WebSocket: Dispatching kanban_update event');
          this.notifyListeners('kanban_update', data);
          break;
        default:
          console.log('WebSocket: Unknown notification type:', data.event_type);
      }
    } else {
      console.log('WebSocket: Unknown message type:', type);
    }
  }

  showAssignmentNotification(data) {
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      const notification = new Notification('New Issue Assignment', {
        body: data.message,
        icon: '/favicon.ico',
        tag: `issue-${data.issue.id}`,
        requireInteraction: true
      });

      notification.onclick = () => {
        // Focus window and navigate to issue
        window.focus();
        this.notifyListeners('notification_click', data);
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    }

    // Play notification sound
    this.playNotificationSound();
  }

  playNotificationSound() {
    try {
      // Create a simple notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }

  // Event listener management
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  removeEventListener(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyListeners(event, data) {
    console.log(`WebSocket: Notifying ${event} listeners, count:`, this.listeners.has(event) ? this.listeners.get(event).length : 0);
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback, index) => {
        try {
          console.log(`WebSocket: Calling ${event} listener ${index}`);
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener ${index}:`, error);
        }
      });
    } else {
      console.log(`WebSocket: No listeners registered for event: ${event}`);
    }
  }
}

// Export singleton instance
export const websocketNotificationService = new WebSocketNotificationService();
