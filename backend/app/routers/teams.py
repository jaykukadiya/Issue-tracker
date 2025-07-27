from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.models import (
    Team, TeamCreate, TeamUpdate, TeamWithMembers,
    TeamMember, TeamMemberCreate, TeamMemberInDB, 
    User, UserListResponse
)
from app.auth import get_current_active_user, get_user_by_username
from app.database import get_database
from app.notification_service import notification_service
from bson import ObjectId
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/teams", tags=["teams"])


# Team CRUD Operations
@router.post("/", response_model=Team)
async def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new team"""
    db = await get_database()
    
    try:
        # Create team document
        team_doc = {
            "name": team_data.name,
            "description": team_data.description,
            "created_by": current_user.id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "is_active": True,
            "member_count": 1
        }
        
        # Insert team
        result = await db.teams.insert_one(team_doc)
        team_id = str(result.inserted_id)
        
        # Add creator as admin member
        member_doc = {
            "team_id": team_id,
            "user_id": current_user.id,
            "username": current_user.username,
            "role": "admin",
            "added_by": current_user.id,
            "added_at": datetime.utcnow(),
            "is_active": True
        }
        
        await db.team_members.insert_one(member_doc)
        
        # Fetch created team
        created_team = await db.teams.find_one({"_id": result.inserted_id})
        
        logger.info(f"Team created: {team_data.name} by {current_user.username}")
        
        return Team.from_mongo(created_team)
        
    except Exception as e:
        logger.error(f"Error creating team: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create team"
        )


@router.get("/")
async def get_user_teams(
    current_user: User = Depends(get_current_active_user)
):
    """Get all teams the current user is a member of"""
    db = await get_database()
    
    try:
        # Get user's team memberships - try both ObjectId and string formats
        user_memberships = await db.team_members.find({
            "$or": [
                {"user_id": current_user.id},  # ObjectId format
                {"user_id": str(current_user.id)}  # String format
            ],
            "is_active": True
        }).to_list(None)
        
        if not user_memberships:
            # Return empty teams list if user has no memberships
            return {"teams": []}
        
        teams_with_members = []
        
        for membership in user_memberships:
            try:
                # Get team details
                team_doc = await db.teams.find_one({
                    "_id": ObjectId(membership["team_id"]),
                    "is_active": True
                })
                
                if not team_doc:
                    continue
                    
                # Get all team members
                team_members = await db.team_members.find({
                    "team_id": membership["team_id"],
                    "is_active": True
                }).to_list(None)
                
                # Convert all values to JSON-serializable types
                def safe_serialize(value):
                    if hasattr(value, 'isoformat'):
                        return value.isoformat()
                    elif isinstance(value, ObjectId):
                        return str(value)
                    else:
                        return value
                
                # Build team response with safe serialization
                team_response = {
                    "id": str(team_doc["_id"]),
                    "name": safe_serialize(team_doc["name"]),
                    "description": safe_serialize(team_doc.get("description", "")),
                    "created_by": safe_serialize(team_doc["created_by"]),
                    "created_at": safe_serialize(team_doc["created_at"]),
                    "updated_at": safe_serialize(team_doc["updated_at"]),
                    "is_active": bool(team_doc["is_active"]),
                    "member_count": len(team_members),
                    "user_role": safe_serialize(membership["role"])
                }
                
                teams_with_members.append(team_response)
                
            except Exception as member_error:
                logger.error(f"Error processing team {membership.get('team_id', 'unknown')}: {member_error}")
                continue
        
        return {"teams": teams_with_members}
        
    except Exception as e:
        logger.error(f"Error fetching user teams: {e}")
        # Return empty teams instead of error for better UX
        return {"teams": []}


@router.post("/{team_id}/members", response_model=TeamMember)
async def add_team_member(
    team_id: str,
    member_data: TeamMemberCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Add a member to a team (Admin only)"""
    db = await get_database()
    
    try:
        # Check if current user is admin of the team
        user_membership = await db.team_members.find_one({
            "team_id": team_id,
            "$or": [
                {"user_id": current_user.id},  # ObjectId format
                {"user_id": str(current_user.id)}  # String format
            ],
            "role": "admin",
            "is_active": True
        })
        
        if not user_membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only team admins can add members"
            )
        
        # Check if user exists by username
        user_to_add = await get_user_by_username(member_data.username)
        if not user_to_add:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User with this username not found"
            )
        
        # Check if user is already a team member
        existing_member = await db.team_members.find_one({
            "team_id": team_id,
            "$or": [
                {"user_id": user_to_add.id},  # ObjectId format
                {"user_id": str(user_to_add.id)}  # String format
            ],
            "is_active": True
        })
        
        if existing_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User is already a team member"
            )
        
        # Create team member record
        member_doc = {
            "team_id": team_id,
            "user_id": str(user_to_add.id),
            "username": user_to_add.username,
            "role": member_data.role,
            "added_by": str(current_user.id),
            "added_at": datetime.utcnow(),
            "is_active": True
        }
        
        # Insert into database
        result = await db.team_members.insert_one(member_doc)
        
        # Update team member count
        await db.teams.update_one(
            {"_id": ObjectId(team_id)},
            {"$inc": {"member_count": 1}}
        )
        
        # Get team name for notification
        team_doc = await db.teams.find_one({"_id": ObjectId(team_id)})
        team_name = team_doc.get("name", "Unknown Team") if team_doc else "Unknown Team"
        
        # Send notification to added user
        try:
            await notification_service.notify_team_added(
                team_id=team_id,
                team_name=team_name,
                added_user_id=str(user_to_add.id),
                added_by_username=current_user.username
            )
        except Exception as notif_error:
            logger.warning(f"Failed to send team notification: {notif_error}")
        
        # Fetch created member
        created_member = await db.team_members.find_one({"_id": result.inserted_id})
        
        logger.info(f"Team member added: {user_to_add.username} to team {team_id} by {current_user.username}")
        
        return TeamMember.from_mongo(created_member)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding team member: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add team member"
        )


@router.get("/{team_id}/members", response_model=UserListResponse)
async def get_specific_team_members(
    team_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get members of a specific team"""
    db = await get_database()
    
    try:
        # Check if current user is a member of this team with multiple ID formats
        user_membership = await db.team_members.find_one({
            "team_id": team_id,
            "user_id": str(current_user.id),
            "is_active": True
        })
        
        # If not found with string ID, try with ObjectId (for data consistency)
        if not user_membership:
            user_membership = await db.team_members.find_one({
                "team_id": team_id,
                "user_id": current_user.id,  # Try with ObjectId
                "is_active": True
            })
        
        # Also check if user is the team creator
        if not user_membership:
            team = await db.teams.find_one({"_id": ObjectId(team_id)})
            if team and str(team.get("created_by")) == str(current_user.id):
                # User is team creator, allow access
                user_membership = {"role": "admin", "user_id": str(current_user.id)}
        
        if not user_membership:
            logger.warning(f"User {current_user.username} ({current_user.id}) denied access to team {team_id}")
            # Debug: Check what memberships exist for this user
            user_memberships = await db.team_members.find({
                "user_id": {"$in": [str(current_user.id), current_user.id]}
            }).to_list(None)
            logger.info(f"User memberships: {[m.get('team_id') for m in user_memberships]}")
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a member of this team"
            )
        
        # Get all team members
        team_members = await db.team_members.find({
            "team_id": team_id,
            "is_active": True
        }).to_list(None)
        
        logger.info(f"Found {len(team_members)} team members for team {team_id}")
        for i, member in enumerate(team_members):
            logger.info(f"Member {i}: user_id={member['user_id']} (type: {type(member['user_id'])}), username={member.get('username', 'N/A')}")
        
        # Get user details for each member
        users = []
        for member in team_members:
            user_id = member["user_id"]
            
            # Try to find user with ObjectId format first
            user_data = None
            try:
                if ObjectId.is_valid(user_id):
                    user_data = await db.users.find_one({"_id": ObjectId(user_id)})
            except Exception:
                pass
            
            # If not found and user_id is already ObjectId, try as string comparison
            if not user_data:
                try:
                    # Search by string representation in case of data inconsistency
                    all_users = await db.users.find({}).to_list(None)
                    for u in all_users:
                        if str(u["_id"]) == str(user_id):
                            user_data = u
                            break
                except Exception as e:
                    logger.warning(f"Error finding user {user_id}: {e}")
            
            if user_data:
                user_data["id"] = str(user_data["_id"])
                users.append(User(**user_data))
            else:
                logger.warning(f"User not found for user_id: {user_id} (type: {type(user_id)})")
        
        return UserListResponse(users=users, total=len(users))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team members: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching team members"
        )


@router.get("/members", response_model=UserListResponse)
async def get_all_team_members(
    current_user: User = Depends(get_current_active_user)
):
    """Get all users from teams the current user is a member of"""
    db = await get_database()
    
    try:
        # Get user's team memberships
        user_memberships = await db.team_members.find({
            "user_id": str(current_user.id),
            "is_active": True
        }).to_list(None)
        
        if not user_memberships:
            return UserListResponse(users=[], total=0)
        
        # Get all team IDs user is a member of
        user_team_ids = [membership["team_id"] for membership in user_memberships]
        
        # Get all members from these teams
        all_team_members = await db.team_members.find({
            "team_id": {"$in": user_team_ids},
            "is_active": True
        }).to_list(None)
        
        # Get unique user IDs
        unique_user_ids = list(set([member["user_id"] for member in all_team_members]))
        
        # Get user details
        users = []
        for user_id in unique_user_ids:
            user_data = await db.users.find_one({"_id": ObjectId(user_id)})
            if user_data:
                user_data["id"] = str(user_data["_id"])
                users.append(User(**user_data))
        
        return UserListResponse(users=users, total=len(users))
        
    except Exception as e:
        logger.error(f"Error fetching team members: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error fetching team members"
        )
