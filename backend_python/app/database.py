# pyrefly: ignore [missing-import]
from motor.motor_asyncio import AsyncIOMotorClient
from .config import settings
import logging

logger = logging.getLogger(__name__)

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    try:
        db.client = AsyncIOMotorClient(settings.MONGO_URI)
        # Verify connection
        await db.client.admin.command('ping')
        db_name = settings.MONGO_URI.split('/')[-1].split('?')[0] or "academy-crm"
        db.db = db.client[db_name]
        logger.info(f"Connected to MongoDB: {db_name}")
    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        raise e

async def close_mongo_connection():
    if db.client:
        db.client.close()
        logger.info("MongoDB connection closed")

def get_database():
    return db.db
