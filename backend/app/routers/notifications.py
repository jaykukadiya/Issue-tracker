from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models import (
    Notification, NotificationCreate, NotificationInDB, NotificationListResponse,
    User, NotificationType
)
from app.auth import get_current_active_user
from app.database import get_database
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user)
):
    """Get user notifications with pagination"""
    db = await get_database()
    
    try:
        # Build filter query
        filter_query = {"user_id": str(current_user.id)}
        if unread_only:
            filter_query["is_read"] = False
        
        # Calculate skip value for pagination
        skip = (page - 1) * size
        
        # Get notifications with pagination
        notifications_data = await db.notifications.find(filter_query)\
            .sort("created_at", -1)\
            .skip(skip)\
            .limit(size)\
            .to_list(size)
        
        # Convert to response models
        notifications = [Notification.from_mongo(notification) for notification in notifications_data]
        
        # Get total count
        total = await db.notifications.count_documents(filter_query)
        
        # Get unread count
        unread_count = await db.notifications.count_documents({
            "user_id": str(current_user.id),
            "is_read": False
        })
        
        return NotificationListResponse(
            notifications=notifications,
            total=total,
            unread_count=unread_count
        )
        
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching notifications"
        )


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Mark a notification as read"""
    db = await get_database()
    
    try:
        # Check if notification exists and belongs to user
        notification = await db.notifications.find_one({
            "_id": notification_id,
            "user_id": str(current_user.id)
        })
        
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        # Update notification
        await db.notifications.update_one(
            {"_id": notification_id},
            {"$set": {"is_read": True, "updated_at": datetime.utcnow()}}
        )
        
        return {"message": "Notification marked as read"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating notification"
        )


@router.put("/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user)
):
    """Mark all notifications as read for the current user"""
    db = await get_database()
    
    try:
        # Update all unread notifications for the user
        result = await db.notifications.update_many(
            {
                "user_id": str(current_user.id),
                "is_read": False
            },
            {"$set": {"is_read": True, "updated_at": datetime.utcnow()}}
        )
        
        return {"message": f"Marked {result.modified_count} notifications as read"}
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating notifications"
        )


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_active_user)
):
    """Get count of unread notifications"""
    db = await get_database()
    
    try:
        unread_count = await db.notifications.count_documents({
            "user_id": str(current_user.id),
            "is_read": False
        })
        
        return {"unread_count": unread_count}
        
    except Exception as e:
        logger.error(f"Error fetching unread count: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching unread count"
        )
