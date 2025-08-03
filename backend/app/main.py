from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import connect_to_mongo, close_mongo_connection
from app.routers import auth, issues, teams, notifications, websocket_notifications, ai
from app.middleware import LoggingMiddleware  # Import the new middleware
import logging
import sys
import os

# --- Structured Logging Configuration ---
# Remove all handlers associated with the root logger object.
for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler)

# Add a new handler to send logs to stdout (console).
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    stream=sys.stdout,
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    await connect_to_mongo()
    yield
    # Shutdown
    logger.info("Shutting down...")
    await close_mongo_connection()


app = FastAPI(
    title="Mini Issue Tracker API",
    description="A FastAPI-based issue tracking system with AI-powered description enhancement",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
allowed_origins = os.getenv("ALLOWED_ORIGINS", "https://issue-tracker-seven-fawn.vercel.app,http://localhost:3000,http://127.0.0.1:3000,https://issue-tracker-b0x6vaerz-jay-kukadiyas-projects-6fab814e.vercel.app").split(",")

# Add middlewares
app.add_middleware(LoggingMiddleware)  # Add our custom logging middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(issues.router)
app.include_router(teams.router)
app.include_router(websocket_notifications.router)
app.include_router(notifications.router)
app.include_router(ai.router, prefix="/ai", tags=["AI"])


@app.get("/")
async def root():
    return {"message": "Mini Issue Tracker API", "version": "1.0.0"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
