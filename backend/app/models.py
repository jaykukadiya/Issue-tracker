from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str) and ObjectId.is_valid(v):
            return ObjectId(v)
        raise ValueError("Invalid ObjectId")


class IssueStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    CLOSED = "CLOSED"


class IssuePriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


# User Models
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class User(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


# Issue Models
class IssueBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    status: IssueStatus = IssueStatus.OPEN
    priority: IssuePriority = IssuePriority.MEDIUM
    tags: Optional[List[str]] = []
    team_id: str = Field(..., description="Team ID that this issue belongs to")
    assigned_to: Optional[PyObjectId] = None


class IssueCreate(IssueBase):
    pass


class IssueUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, min_length=1)
    status: Optional[IssueStatus] = None
    priority: Optional[IssuePriority] = None
    tags: Optional[List[str]] = None
    assigned_to: Optional[str] = None  # Changed to accept string (username or ObjectId)


class IssueInDB(IssueBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_by: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class Issue(IssueBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        
    @classmethod
    def from_mongo(cls, data: dict):
        """Create Issue from MongoDB document"""
        if data and "_id" in data:
            # Convert MongoDB _id to string id
            data["id"] = str(data.pop("_id"))
            data["created_by"] = str(data["created_by"])
            if data.get("assigned_to"):
                data["assigned_to"] = str(data["assigned_to"])
        return cls(**data)


# Team Models
class TeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True


class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class Team(TeamBase):
    id: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    member_count: int = 0
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        
    @classmethod
    def from_mongo(cls, data: dict):
        """Create Team from MongoDB document"""
        if data and "_id" in data:
            data["id"] = str(data.pop("_id"))
            data["created_by"] = str(data["created_by"])
        return cls(**data)


class TeamMemberBase(BaseModel):
    user_id: str
    username: str
    role: str = "member"  # member, admin


class TeamMemberCreate(BaseModel):
    username: str
    role: str = "member"


class TeamMemberInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    team_id: str
    user_id: str
    username: str
    role: str = "member"
    added_by: str
    added_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TeamMember(BaseModel):
    id: str
    team_id: str
    user_id: str
    username: str
    role: str
    added_by: str
    added_at: datetime
    is_active: bool = True

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        
    @classmethod
    def from_mongo(cls, data: dict):
        """Create TeamMember from MongoDB document"""
        if data and "_id" in data:
            data["id"] = str(data.pop("_id"))
        return cls(**data)


class TeamWithMembers(Team):
    members: List[TeamMember] = []
    user_role: Optional[str] = None  # Current user's role in this team


# Authentication Models
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# AI Enhancement Models
class DescriptionEnhanceRequest(BaseModel):
    description: str = Field(..., min_length=1)


class DescriptionEnhanceResponse(BaseModel):
    original_description: str


# Response Models
class IssueListResponse(BaseModel):
    issues: List[Issue]
    total: int
    page: int
    size: int


class UserListResponse(BaseModel):
    users: List[User]
    total: int


# Notification Models
class NotificationType(str, Enum):
    ISSUE_ASSIGNED = "ISSUE_ASSIGNED"
    ISSUE_UPDATED = "ISSUE_UPDATED"
    ISSUE_STATUS_CHANGED = "ISSUE_STATUS_CHANGED"
    ISSUE_COMMENT = "ISSUE_COMMENT"
    TEAM_INVITE = "TEAM_INVITE"


class NotificationBase(BaseModel):
    type: NotificationType
    title: str
    message: str
    issue_id: Optional[str] = None
    related_user_id: Optional[str] = None
    is_read: bool = False


class NotificationCreate(NotificationBase):
    user_id: str  # User who will receive the notification


class NotificationInDB(NotificationBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True


class Notification(BaseModel):
    id: str
    type: NotificationType
    title: str
    message: str
    issue_id: Optional[str] = None
    related_user_id: Optional[str] = None
    is_read: bool = False
    created_at: datetime
    updated_at: datetime
    
    @classmethod
    def from_mongo(cls, data: dict):
        """Create Notification from MongoDB document"""
        if data:
            data["id"] = str(data.pop("_id"))
            return cls(**data)
        return None


class NotificationListResponse(BaseModel):
    notifications: List[Notification]
    total: int
    unread_count: int
