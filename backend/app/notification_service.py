from app.models import NotificationCreate, NotificationInDB, NotificationType
from app.database import get_database
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating and managing notifications"""
    
    @staticmethod
    async def create_notification(notification_data: NotificationCreate) -> str:
        """Create a new notification"""
        try:
            db = await get_database()
            
            # Create notification document
            notification_doc = NotificationInDB(**notification_data.dict())
            
            # Insert into database
            result = await db.notifications.insert_one(notification_doc.dict(by_alias=True))
            notification_id = str(result.inserted_id)

            logger.info(f"Created notification for user {notification_data.user_id}: {notification_data.title}")
            return notification_id
            
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            raise
    
    @staticmethod
    async def notify_issue_assigned(issue_id: str, issue_title: str, assigned_user_id: str, assigner_username: str):
        """Create notification when an issue is assigned"""
        notification = NotificationCreate(
            user_id=assigned_user_id,
            type=NotificationType.ISSUE_ASSIGNED,
            title="New Issue Assigned",
            message=f"You have been assigned to issue: {issue_title} by {assigner_username}",
            issue_id=issue_id
        )
        return await NotificationService.create_notification(notification)
    
    @staticmethod
    async def notify_issue_updated(issue_id: str, issue_title: str, assigned_user_id: str, updater_username: str, changes: str):
        """Create notification when an assigned issue is updated"""
        if assigned_user_id:  # Only notify if issue is assigned
            notification = NotificationCreate(
                user_id=assigned_user_id,
                type=NotificationType.ISSUE_UPDATED,
                title="Issue Updated",
                message=f"Issue '{issue_title}' has been updated by {updater_username}. Changes: {changes}",
                issue_id=issue_id
            )
            return await NotificationService.create_notification(notification)
    
    @staticmethod
    async def notify_issue_status_changed(issue_id: str, issue_title: str, assigned_user_id: str, updater_username: str, old_status: str, new_status: str):
        """Create notification when issue status changes"""
        if assigned_user_id:  # Only notify if issue is assigned
            notification = NotificationCreate(
                user_id=assigned_user_id,
                type=NotificationType.ISSUE_STATUS_CHANGED,
                title="Issue Status Changed",
                message=f"Issue '{issue_title}' status changed from {old_status} to {new_status} by {updater_username}",
                issue_id=issue_id
            )
            return await NotificationService.create_notification(notification)
    
    @staticmethod
    async def notify_team_invite(invited_user_id: str, inviter_username: str):
        """Create notification for team invitation"""
        notification = NotificationCreate(
            user_id=invited_user_id,
            type=NotificationType.TEAM_INVITE,
            title="Team Invitation",
            message=f"You have been invited to join the team by {inviter_username}"
        )
        return await NotificationService.create_notification(notification)
    
    @staticmethod
    async def notify_team_added(team_id: str, team_name: str, added_user_id: str, added_by_username: str):
        """Create notification for being added to a team"""
        notification = NotificationCreate(
            user_id=added_user_id,
            type=NotificationType.TEAM_INVITE,
            title="Added to Team",
            message=f"You have been added to team '{team_name}' by {added_by_username}"
        )
        return await NotificationService.create_notification(notification)


# Global notification service instance
notification_service = NotificationService()
