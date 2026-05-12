import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "IT Park Surxondaryo CRM"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/academy-crm")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your_jwt_secret_key_here")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    PORT: int = int(os.getenv("PORT", 5000))
    ENV: str = os.getenv("NODE_ENV", "development")
    CLIENT_URL: str = os.getenv("CLIENT_URL", "*")

settings = Settings()
