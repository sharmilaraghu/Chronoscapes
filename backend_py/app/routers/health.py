"""
GET /api/health — liveness check.
"""

from fastapi import APIRouter
from app.lib.logger import get_logger

router = APIRouter()
logger = get_logger("health")


@router.get("/health")
async def health():
    logger.debug("Health check")
    return {"success": True}