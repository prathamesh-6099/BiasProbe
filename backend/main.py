"""
BiasProbe — FastAPI Application Entry Point
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_firebase_app, LOCAL_DEV
from routers.audit import router as audit_router
from routers.report import router as report_router

# ── Logging Configuration ─────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("biasProbe")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup."""
    # Initialize Firebase Admin SDK
    try:
        get_firebase_app()
        logger.info("Firebase initialized successfully")
    except Exception as e:
        logger.warning("Firebase init failed (will retry on first request): %s", e)
    yield


app = FastAPI(
    title="BiasProbe API",
    version="0.1.0",
    description="LLM Bias Testing & Auditing Platform",
    lifespan=lifespan,
)

# ── CORS Middleware ────────────────────────────────────────────────────────────
# In dev mode, allow all origins for easy local testing.
# In production, restrict to known domains.

_allowed_origins = [
    "http://localhost:3000",       # Next.js dev
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

if not LOCAL_DEV:
    _allowed_origins += [
        "https://*.web.app",           # Firebase Hosting
        "https://*.firebaseapp.com",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if LOCAL_DEV else _allowed_origins,
    allow_credentials=not LOCAL_DEV,  # credentials=True is incompatible with origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routers ──────────────────────────────────────────────────────────
app.include_router(audit_router)
app.include_router(report_router)


# ── Health Check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["system"])
async def health_check():
    return {"status": "healthy", "service": "biasProbe-api", "version": "0.1.0"}


@app.get("/", tags=["system"])
async def root():
    return {
        "message": "BiasProbe API — LLM Bias Auditing Platform",
        "docs": "/docs",
        "health": "/health",
    }
