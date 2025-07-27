from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings
from app.database import get_database
from app.models import User, TokenData
from bson import ObjectId

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT token scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password"""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


async def get_user_by_username(username: str) -> Optional[User]:
    """Get user by username from database"""
    db = await get_database()
    user_data = await db.users.find_one({"username": username})
    if user_data:
        # Convert MongoDB document to User object
        user_data["id"] = str(user_data["_id"])
        return User(**user_data)
    return None


async def get_user_by_email(email: str) -> Optional[User]:
    """Get user by email from database"""
    db = await get_database()
    user_data = await db.users.find_one({"email": email})
    if user_data:
        # Convert MongoDB document to User object
        user_data["id"] = str(user_data["_id"])
        return User(**user_data)
    return None


async def get_user_by_id(user_id: str) -> Optional[User]:
    """Get user by ID from database"""
    db = await get_database()
    user_data = await db.users.find_one({"_id": ObjectId(user_id)})
    if user_data:
        # Convert MongoDB document to User object
        user_data["id"] = str(user_data["_id"])
        return User(**user_data)
    return None


async def authenticate_user(username: str, password: str) -> Optional[User]:
    """Authenticate user with username and password"""
    db = await get_database()
    user_data = await db.users.find_one({"username": username})
    if not user_data:
        return None
    
    if not verify_password(password, user_data["hashed_password"]):
        return None
    
    return User(**user_data)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = await get_user_by_username(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_user_websocket(token: str) -> Optional[User]:
    """Get current user from JWT token for WebSocket connections"""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        if username is None:
            return None
        token_data = TokenData(username=username)
    except JWTError:
        return None
    
    user = await get_user_by_username(username=token_data.username)
    if user is None or not user.is_active:
        return None
    return user
