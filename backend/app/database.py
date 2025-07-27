from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class Database:
    client: AsyncIOMotorClient = None
    database = None


db = Database()


async def get_database():
    return db.database


async def connect_to_mongo():
    """Create database connection"""
    try:
        db.client = AsyncIOMotorClient(settings.mongodb_url)
        db.database = db.client[settings.database_name]
        
        # Test the connection
        await db.client.admin.command('ping')
        logger.info("Successfully connected to MongoDB")
        
        # Create indexes
        await create_indexes()
        
    except ConnectionFailure as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close database connection"""
    if db.client:
        db.client.close()
        logger.info("Disconnected from MongoDB")


async def create_indexes():
    """Create database indexes for better performance"""
    try:
        # Users collection indexes
        await db.database.users.create_index("email", unique=True)
        await db.database.users.create_index("username", unique=True)
        
        # Issues collection indexes
        await db.database.issues.create_index("created_by")
        await db.database.issues.create_index("assigned_to")
        await db.database.issues.create_index("status")
        await db.database.issues.create_index("created_at")
        
        # Team members collection indexes
        await db.database.team_members.create_index([("team_id", 1), ("user_id", 1)], unique=True)
        
        logger.info("Database indexes created successfully")
        
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")
