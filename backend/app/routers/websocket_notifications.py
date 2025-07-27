from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from app.websocket_notifications import notification_manager
from app.auth import get_current_user_websocket
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws/notifications")
async def websocket_notifications_endpoint(websocket: WebSocket, token: str = None):
    """WebSocket endpoint for real-time notifications"""
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        # Authenticate user from token
        user = await get_current_user_websocket(token)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        user_id = str(user.id)
        
        # Connect user to WebSocket
        await notification_manager.connect(websocket, user_id)
        
        try:
            # Keep connection alive and handle incoming messages
            while True:
                # Wait for any message from client (ping/pong, etc.)
                data = await websocket.receive_text()
                
                # Handle ping/pong for connection health
                if data == "ping":
                    await websocket.send_text("pong")
                    
        except WebSocketDisconnect:
            logger.info(f"User {user_id} disconnected from notifications WebSocket")
        except Exception as e:
            logger.error(f"WebSocket error for user {user_id}: {e}")
        finally:
            # Clean up connection
            notification_manager.disconnect(websocket, user_id)
            
    except Exception as e:
        logger.error(f"WebSocket authentication error: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
