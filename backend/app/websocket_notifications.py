from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)

def serialize_for_json(obj):
    """Convert objects to JSON-serializable format"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {key: serialize_for_json(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [serialize_for_json(item) for item in obj]
    else:
        return obj

class NotificationWebSocketManager:
    def __init__(self):
        # Store active connections by user_id
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Connect a user's WebSocket"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected to notifications WebSocket")

    def disconnect(self, websocket: WebSocket, user_id: str):
        """Disconnect a user's WebSocket"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            # Clean up empty lists
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        logger.info(f"User {user_id} disconnected from notifications WebSocket")

    async def send_notification_to_user(self, user_id: str, notification_data: dict):
        """Send a notification to a specific user"""
        if user_id not in self.active_connections:
            logger.debug(f"No active connections for user {user_id}")
            return

        # Create notification message
        message = {
            "type": "notification",
            "data": notification_data
        }

        # Send to all active connections for this user
        disconnected_connections = []
        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_text(json.dumps(message))
                logger.debug(f"Sent notification to user {user_id}")
            except Exception as e:
                logger.warning(f"Failed to send notification to user {user_id}: {e}")
                disconnected_connections.append(websocket)

        # Clean up disconnected connections
        for websocket in disconnected_connections:
            self.disconnect(websocket, user_id)

    async def send_issue_assignment(self, user_id: str, issue_data: dict, assigner_username: str):
        """Send issue assignment notification to user"""
        # Serialize the issue data to handle datetime objects
        serialized_issue_data = serialize_for_json(issue_data)
        
        notification_data = {
            "event_type": "issue_assigned",
            "issue": serialized_issue_data,
            "assigner": assigner_username,
            "timestamp": serialize_for_json(issue_data.get("updated_at")),
            "message": f"You have been assigned to issue: {issue_data.get('title', 'Unknown')}"
        }
        
        await self.send_notification_to_user(user_id, notification_data)

    async def send_kanban_update(self, user_id: str, issue_data: dict, action: str):
        """Send Kanban board update to user"""
        # Serialize the issue data to handle datetime objects
        serialized_issue_data = serialize_for_json(issue_data)
        
        notification_data = {
            "event_type": "kanban_update",
            "action": action,  # "assigned", "status_changed", "updated", "deleted"
            "issue": serialized_issue_data,
            "timestamp": serialize_for_json(issue_data.get("updated_at"))
        }
        
        await self.send_notification_to_user(user_id, notification_data)

# Global instance
notification_manager = NotificationWebSocketManager()
