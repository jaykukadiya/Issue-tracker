import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { websocketNotificationService } from '../services/websocketNotifications';


export const useWebSocketNotifications = () => {
  const { user, token } = useAuth();
  const isConnectedRef = useRef(false);

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    console.log('useWebSocketNotifications: Effect triggered', { 
      user: !!user, 
      token: !!token, 
      isConnected: isConnectedRef.current 
    });
    
    if (user && token && !isConnectedRef.current) {
      console.log('useWebSocketNotifications: Connecting to WebSocket notifications...', {
        username: user.username,
        tokenLength: token.length
      });
      websocketNotificationService.connect(token);
      isConnectedRef.current = true;
    } else {
      console.log('useWebSocketNotifications: Not connecting because:', {
        hasUser: !!user,
        hasToken: !!token,
        alreadyConnected: isConnectedRef.current
      });
    }

    // Cleanup on unmount or logout
    return () => {
      if (isConnectedRef.current) {
        console.log('useWebSocketNotifications: Disconnecting from WebSocket notifications...');
        websocketNotificationService.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [user, token]);

  // Disconnect when user logs out
  useEffect(() => {
    if (!user && isConnectedRef.current) {
      console.log('User logged out, disconnecting WebSocket...');
      websocketNotificationService.disconnect();
      isConnectedRef.current = false;
    }
  }, [user]);

  return {
    isConnected: isConnectedRef.current
  };
};

export const useIssueAssignmentNotifications = (onIssueAssigned) => {
  const callbackRef = useRef(onIssueAssigned);
  callbackRef.current = onIssueAssigned;

  useEffect(() => {
    console.log('Hook: Initializing useIssueAssignmentNotifications');
    
    const handleIssueAssigned = (data) => {
      console.log('Hook: handleIssueAssigned called with data:', data);
      
      // Call the provided callback
      if (callbackRef.current) {
        console.log('Hook: Calling assignment callback');
        callbackRef.current(data);
      } else {
        console.log('Hook: No assignment callback provided');
      }
    };

    const handleNotificationClick = (data) => {
      console.log('Hook: handleNotificationClick called with data:', data);
      if (data.event_type === 'issue_assigned') {
        // Navigate to the issue (this will be handled by the component)
        if (callbackRef.current) {
          console.log('Hook: Calling click callback');
          callbackRef.current(data, 'click');
        }
      }
    };

    console.log('Hook: Registering issue_assigned and notification_click listeners');
    websocketNotificationService.addEventListener('issue_assigned', handleIssueAssigned);
    websocketNotificationService.addEventListener('notification_click', handleNotificationClick);

    return () => {
      console.log('Hook: Cleaning up useIssueAssignmentNotifications listeners');
      websocketNotificationService.removeEventListener('issue_assigned', handleIssueAssigned);
      websocketNotificationService.removeEventListener('notification_click', handleNotificationClick);
    };
  }, []);
};

export const useKanbanUpdates = (onKanbanUpdate) => {
  const callbackRef = useRef(onKanbanUpdate);
  callbackRef.current = onKanbanUpdate;

  useEffect(() => {
    console.log('Hook: Initializing useKanbanUpdates');
    
    const handleKanbanUpdate = (data) => {
      console.log('Hook: handleKanbanUpdate called with data:', data);
      
      if (callbackRef.current) {
        console.log('Hook: Calling kanban update callback');
        callbackRef.current(data);
      } else {
        console.log('Hook: No kanban update callback provided');
      }
    };

    console.log('Hook: Registering kanban_update listener');
    websocketNotificationService.addEventListener('kanban_update', handleKanbanUpdate);

    return () => {
      console.log('Hook: Cleaning up useKanbanUpdates listener');
      websocketNotificationService.removeEventListener('kanban_update', handleKanbanUpdate);
    };
  }, []);
};
