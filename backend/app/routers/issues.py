from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models import (
    Issue, IssueCreate, IssueUpdate, IssueInDB, IssueListResponse,
    User, IssueStatus, IssuePriority
)
from app.auth import get_current_active_user
from app.database import get_database
from app.notification_service import notification_service
from app.websocket_notifications import notification_manager
from bson import ObjectId
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/issues", tags=["issues"])


@router.get("", response_model=IssueListResponse)
async def get_issues(
    status_filter: Optional[IssueStatus] = Query(None, alias="status"),
    priority: Optional[IssuePriority] = None,
    search: Optional[str] = None,
    created_by: Optional[str] = None,
    team_id: Optional[str] = Query(None, description="Filter by team ID"),
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user)
):
    """Get issues with filtering and pagination (only from user's teams)"""
    db = await get_database()
    
    # Build filter query
    filter_query = {}
    
    if status_filter:
        filter_query["status"] = status_filter
    if priority:
        filter_query["priority"] = priority
    if search:
        filter_query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if created_by:
        filter_query["created_by"] = created_by
    
    try:
        # Get user's team memberships with flexible ID matching
        user_memberships = await db.team_members.find({
            "user_id": {"$in": [str(current_user.id), current_user.id]},
            "is_active": True
        }).to_list(None)
        
        # Also get teams where user is the creator
        created_teams = await db.teams.find({
            "created_by": {"$in": [str(current_user.id), current_user.id]},
            "is_active": True
        }).to_list(None)
        
        # Extract team IDs that user is a member of or created
        user_team_ids = [membership["team_id"] for membership in user_memberships]
        created_team_ids = [str(team["_id"]) for team in created_teams]
        
        # Combine both lists and remove duplicates
        all_user_team_ids = list(set(user_team_ids + created_team_ids))
        
        logger.info(f"User {current_user.username} has access to teams: {all_user_team_ids}")
        
        # If user is not a member of any team and hasn't created any, return empty results
        if not all_user_team_ids:
            logger.warning(f"User {current_user.username} has no team access")
            return IssueListResponse(
                issues=[],
                total=0,
                page=page,
                size=size
            )
        
        # Add team membership filter to the query
        if team_id:
            # If specific team is requested, check if user has access to that team
            if team_id in all_user_team_ids:
                filter_query["team_id"] = team_id
            else:
                # User doesn't have access to requested team, return empty
                logger.warning(f"User {current_user.username} denied access to team {team_id}")
                return IssueListResponse(
                    issues=[],
                    total=0,
                    page=page,
                    size=size
                )
        else:
            # Filter by all teams user has access to
            filter_query["team_id"] = {"$in": all_user_team_ids}
        
        # Calculate skip value for pagination
        skip = (page - 1) * size
        
        # Get total count
        total = await db.issues.count_documents(filter_query)
        
        # Get issues with pagination
        cursor = db.issues.find(filter_query).skip(skip).limit(size).sort("created_at", -1)
        issues_data = await cursor.to_list(length=size)
        
        # Convert MongoDB documents to Issue objects with proper ID handling
        issues = [Issue.from_mongo(issue) for issue in issues_data]
        
        return IssueListResponse(
            issues=issues,
            total=total,
            page=page,
            size=size
        )
    except Exception as e:
        logger.error(f"Error fetching issues: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching issues"
        )


@router.post("", response_model=Issue)
async def create_issue(
    issue: IssueCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new issue"""
    db = await get_database()
    
    try:
        # Create issue data
        issue_dict = issue.dict()
        issue_dict['description'] = issue.description
        issue_data = IssueInDB(
            **issue_dict,
            created_by=current_user.id
        )
        
        result = await db.issues.insert_one(issue_data.dict(by_alias=True))
        created_issue = await db.issues.find_one({"_id": result.inserted_id})
        
        # Create Issue object for response with proper ID handling
        issue_response = Issue.from_mongo(created_issue)
        
        # Send notifications if issue is assigned to someone
        if issue_response.assigned_to:
            logger.info(f"Issue created with assignment: {issue_response.id} assigned to {issue_response.assigned_to}")
            try:
                # Send database notification
                logger.info(f"Sending database notification for issue {issue_response.id}")
                await notification_service.notify_issue_assigned(
                    issue_id=str(issue_response.id),
                    issue_title=issue_response.title,
                    assigned_user_id=str(issue_response.assigned_to),
                    assigner_username=current_user.username
                )
                logger.info(f"Database notification sent successfully")
                
                # Send real-time WebSocket notification
                logger.info(f"Sending WebSocket assignment notification to user {issue_response.assigned_to}")
                await notification_manager.send_issue_assignment(
                    user_id=str(issue_response.assigned_to),
                    issue_data=issue_response.dict(),
                    assigner_username=current_user.username
                )
                logger.info(f"WebSocket assignment notification sent")
                
                # Also send Kanban update
                logger.info(f"Sending Kanban update to user {issue_response.assigned_to}")
                await notification_manager.send_kanban_update(
                    user_id=str(issue_response.assigned_to),
                    issue_data=issue_response.dict(),
                    action="assigned"
                )
                logger.info(f"Kanban update sent")
                
                logger.info(f"All assignment notifications sent successfully for issue {issue_response.id} to user {issue_response.assigned_to}")
                
            except Exception as notif_error:
                logger.error(f"Notification sending failed: {notif_error}", exc_info=True)
        else:
            logger.info(f"Issue created without assignment: {issue_response.id}")

        return issue_response
        
    except Exception as e:
        logger.error(f"Error creating issue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating issue"
        )


@router.get("/{issue_id}", response_model=Issue)
async def get_issue(
    issue_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific issue by ID"""
    db = await get_database()
    
    try:
        issue_data = await db.issues.find_one({"_id": issue_id})
        if not issue_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Issue not found"
            )
        
        return Issue.from_mongo(issue_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching issue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching issue"
        )


@router.put("/{issue_id}", response_model=Issue)
async def update_issue(
    issue_id: str,
    issue_update: IssueUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update an issue (only owner can update)"""
    db = await get_database()

    try:
        # Check if issue exists and user has permission
        existing_issue = await db.issues.find_one({"_id": issue_id})
        if not existing_issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Issue not found"
            )
        
        # Check if user is the owner or assigned to the issue
        is_creator = str(existing_issue["created_by"]) == str(current_user.id)
        is_assigned = existing_issue.get("assigned_to") and str(existing_issue["assigned_to"]) == str(current_user.id)
        
        if not (is_creator or is_assigned):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update issues you created or are assigned to"
            )
        
        # Prepare update data
        update_data = {k: v for k, v in issue_update.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        # Handle assigned_to field - convert username to ObjectId if needed
        if "assigned_to" in update_data and update_data["assigned_to"]:
            assigned_to_value = update_data["assigned_to"]
            
            # Check if it's already a valid ObjectId
            if ObjectId.is_valid(assigned_to_value):
                # It's already an ObjectId, keep as is
                pass
            else:
                # Try to resolve username to user ID
                # Handle format like "string1 (user1@example.com)" - extract username
                username = assigned_to_value.split(" (")[0] if " (" in assigned_to_value else assigned_to_value
                
                # Find user by username
                assigned_user = await db.users.find_one({"username": username})
                if assigned_user:
                    update_data["assigned_to"] = str(assigned_user["_id"])
                else:
                    # If user not found, remove assigned_to to avoid errors
                    logger.warning(f"User '{username}' not found for assignment")
                    del update_data["assigned_to"]
        
        # Store original issue data for notifications
        original_assigned_to = existing_issue.get("assigned_to")
        original_status = existing_issue.get("status")
        
        # Update issue
        await db.issues.update_one(
            {"_id": issue_id},
            {"$set": update_data}
        )
        
        # Return updated issue
        updated_issue = await db.issues.find_one({"_id": issue_id})
        issue_response = Issue.from_mongo(updated_issue)
        
        # Create notifications for relevant changes
        try:
            # Check if assignee changed
            new_assigned_to = updated_issue.get("assigned_to")
            if new_assigned_to and new_assigned_to != original_assigned_to:
                # Notify newly assigned user
                await notification_service.notify_issue_assigned(
                    issue_id=issue_id,
                    issue_title=updated_issue.get("title", "Unknown"),
                    assigned_user_id=str(new_assigned_to),
                    assigner_username=current_user.username
                )
                
                # Send real-time WebSocket notification
                try:
                    await notification_manager.send_issue_assignment(
                        user_id=str(new_assigned_to),
                        issue_data=issue_response.dict(),
                        assigner_username=current_user.username
                    )
                    
                    # Also send Kanban update
                    await notification_manager.send_kanban_update(
                        user_id=str(new_assigned_to),
                        issue_data=issue_response.dict(),
                        action="assigned"
                    )
                except Exception as ws_error:
                    logger.warning(f"WebSocket notification failed: {ws_error}")

            # Check if status changed
            new_status = updated_issue.get("status")
            if new_status and new_status != original_status and new_assigned_to:
                await notification_service.notify_issue_status_changed(
                    issue_id=issue_id,
                    issue_title=updated_issue.get("title", "Unknown"),
                    assigned_user_id=str(new_assigned_to),
                    updater_username=current_user.username,
                    old_status=original_status,
                    new_status=new_status
                )

            # Notify about general updates (if assigned and not just assignment/status change)
            elif new_assigned_to and new_assigned_to == original_assigned_to:
                changes = []
                if "title" in update_data:
                    changes.append("title")
                if "description" in update_data:
                    changes.append("description")
                if "priority" in update_data:
                    changes.append("priority")
                if "tags" in update_data:
                    changes.append("tags")
                
                if changes:
                    await notification_service.notify_issue_updated(
                        issue_id=issue_id,
                        issue_title=updated_issue.get("title", "Unknown"),
                        assigned_user_id=str(new_assigned_to),
                        updater_username=current_user.username,
                        changes=", ".join(changes)
                    )
        except Exception as notif_error:
            logger.warning(f"Notification creation failed: {notif_error}")

        return issue_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating issue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating issue"
        )


@router.delete("/{issue_id}")
async def delete_issue(
    issue_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete an issue (only owner can delete)"""
    db = await get_database()
    
    try:
        # Check if issue exists and user has permission
        existing_issue = await db.issues.find_one({"_id": issue_id})
        if not existing_issue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Issue not found"
            )
        
        # Check if user is the owner of the issue
        if str(existing_issue["created_by"]) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own issues"
            )
        
        # Store issue data for broadcast before deletion
        issue_data = Issue.from_mongo(existing_issue).dict()
        
        # Delete issue
        await db.issues.delete_one({"_id": issue_id})

        return {"message": "Issue deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting issue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error deleting issue"
        )


@router.get("/assigned/{user_id}", response_model=List[Issue])
async def get_issues_assigned_to_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get issues assigned to a specific user"""
    db = await get_database()
    
    try:
        issues_data = await db.issues.find({"assigned_to": user_id}).to_list(length=None)
        return [Issue.from_mongo(issue) for issue in issues_data]
        
    except Exception as e:
        logger.error(f"Error fetching assigned issues: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching assigned issues"
        )
