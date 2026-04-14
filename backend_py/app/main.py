"""
Chronoscapes Python Backend — FastAPI entry point.
"""

import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.lib.logger import get_logger
from app.routers import health, search, analyze, synthesize

logger = get_logger("app")

# ── Rate limiter ──────────────────────────────────────────────────────────────

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
)

# ── Lifespan (startup / shutdown) ────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Chronoscopes Python backend", port=settings.PORT)
    logger.info(
        "Configured APIs",
        gemini=bool(settings.GEMINI_API_KEY),
        elevenlabs=bool(settings.ELEVENLABS_API_KEY),
        turbopuffer=bool(settings.TURBOPUFFER_API_KEY),
        hf_token=bool(settings.HF_TOKEN),
    )
    # Warm turbopuffer cache in background (no await)
    try:
        from app.services.search import warm_cache
        warm_cache()
    except Exception as e:
        logger.warning("Cache warm-up failed (non-fatal)", error=str(e))
    yield
    logger.info("Chronoscopes backend shutting down")


# ── App ────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Chronoscopes API",
    description="Acoustic time-travel via archival newspaper text",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list(),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# ── Request logging middleware ─────────────────────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)
    logger.info(
        "Request done",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=duration_ms,
    )
    return response

# ── Routes ─────────────────────────────────────────────────────────────────────

app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(search.router, prefix="/api", tags=["search"])
app.include_router(analyze.router, prefix="/api", tags=["analyze"])
app.include_router(synthesize.router, prefix="/api", tags=["synthesize"])

# ── Global error handler ───────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    message = str(exc)
    logger.error("Unhandled error", error=message, path=request.url.path)
    return {"success": False, "error": message}