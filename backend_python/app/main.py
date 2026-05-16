# pyrefly: ignore [missing-import]
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
import logging
import os
import time

from .config import settings
from .database import connect_to_mongo, close_mongo_connection
from .routes import auth
from .routes import students
from .routes import courses
from .routes import teachers
from .routes import payments
from .routes import attendance
from .routes import grades
from .routes import salaries
from .routes import expenses
from .routes import academies
from .routes import dashboard


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up CRM API...")
    await connect_to_mongo()
    logger.info("MongoDB connected successfully")
    yield
    # Shutdown
    logger.info("Shutting down...")
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/api/docs" if settings.ENV != "production" else None,
    redoc_url=None,
)

# ─── CORS Middleware ───────────────────────────────────────────────────────────
# Production da aniq domain, development da wildcard
client_url = settings.CLIENT_URL.strip()
if client_url == "*" or not client_url:
    allow_origins = ["*"]
    allow_credentials = False  # wildcard + credentials birga ishlamaydi
else:
    # Bir nechta URL bo'lishi mumkin (vergul bilan ajratilgan)
    allow_origins = [u.strip() for u in client_url.split(",") if u.strip()]
    allow_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "X-Total-Count"],
    max_age=600,
)


# ─── Request Logging Middleware ────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({duration:.3f}s)")
    return response


# ─── API Routes ───────────────────────────────────────────────────────────────
API_PREFIX = settings.API_V1_STR

app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(students.router, prefix=API_PREFIX)
app.include_router(courses.router, prefix=API_PREFIX)
app.include_router(teachers.router, prefix=API_PREFIX)
app.include_router(payments.router, prefix=API_PREFIX)
app.include_router(attendance.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(grades.router, prefix=API_PREFIX)
app.include_router(academies.router, prefix=API_PREFIX)
app.include_router(salaries.router, prefix=API_PREFIX)
app.include_router(expenses.router, prefix=API_PREFIX)


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health_check():
    return {
        "success": True,
        "message": "🚀 IT Park Surxondaryo CRM API is running!",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "version": settings.VERSION,
        "env": settings.ENV
    }


# ─── Serve React Frontend in Production ───────────────────────────────────────
CLIENT_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "client", "dist")

if settings.ENV == "production" and os.path.exists(CLIENT_DIST):
    # Avval assets ni mount qilamiz
    assets_dir = os.path.join(CLIENT_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # API so'rovlari bu yerga kelmasin
        if full_path.startswith("api/"):
            return JSONResponse({"success": False, "message": "Not found"}, status_code=404)
        index_file = os.path.join(CLIENT_DIST, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return JSONResponse({"success": False, "message": "Frontend not built"}, status_code=404)
