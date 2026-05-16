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
        db.client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=5000,   # 5 soniya timeout
            connectTimeoutMS=10000,
            maxPoolSize=10,
            minPoolSize=1,
        )
        # Ulanishni tekshirish
        await db.client.admin.command('ping')
        db_name = settings.MONGO_URI.split('/')[-1].split('?')[0] or "academy-crm"
        db.db = db.client[db_name]
        logger.info(f"✅ MongoDB ulandi: {db_name}")

        # Indexlarni yaratish (agar yo'q bo'lsa)
        await _create_indexes()
    except Exception as e:
        logger.error(f"❌ MongoDB ulanmadi: {e}")
        raise e

async def _create_indexes():
    """Muhim indexlarni yaratish — tezlikni oshiradi."""
    try:
        # Students
        await db.db.students.create_index([("academy", 1), ("status", 1)])
        await db.db.students.create_index([("academy", 1), ("course", 1)])
        await db.db.students.create_index([("name", "text"), ("phone", "text")])

        # Payments
        await db.db.payments.create_index([("academy", 1), ("month", 1)])
        await db.db.payments.create_index([("student", 1), ("month", 1)])
        await db.db.payments.create_index([("date", -1)])

        # Attendance
        await db.db.attendance.create_index([("academy", 1), ("date", 1)])
        await db.db.attendance.create_index([("student", 1), ("course", 1), ("date", 1)], unique=True)

        # Courses
        await db.db.courses.create_index([("academy", 1), ("isActive", 1)])

        # Teachers
        await db.db.teachers.create_index([("academy", 1)])

        # Users
        await db.db.users.create_index([("phone", 1)], unique=True)

        # Grades
        await db.db.grades.create_index([("student", 1), ("date", -1)])

        # Expenses
        await db.db.expenses.create_index([("academy", 1), ("date", -1)])

        # Salaries
        await db.db.salaries.create_index([("teacher", 1), ("month", 1)])

        logger.info("✅ MongoDB indexlar tayyor")
    except Exception as e:
        # Index xatosi kritik emas, davom etamiz
        logger.warning(f"⚠️ Index yaratishda xato (normal bo'lishi mumkin): {e}")

async def close_mongo_connection():
    if db.client:
        db.client.close()
        logger.info("MongoDB ulanishi yopildi")

def get_database():
    if db.db is None:
        raise RuntimeError("MongoDB ulangani yo'q. Serverda muammo bor.")
    return db.db
