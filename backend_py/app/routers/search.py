"""
POST /api/search — turbopuffer ANN vector search → passages.
"""

from fastapi import APIRouter, HTTPException
from app.lib.logger import get_logger
from app.lib.types import SearchRequest
from app.services.search import search_passages

router = APIRouter()
logger = get_logger("search")


@router.post("/search")
async def search(request: SearchRequest):
    try:
        logger.info("Search request", query=request.query, era=request.era, location=request.location, year=request.year, limit=request.limit)
        passages = search_passages(
            query=request.query,
            era=request.era,
            location=request.location,
            year=request.year,
            limit=request.limit or 8,
        )
        return {
            "success": True,
            "data": {"passages": [p.model_dump() for p in passages], "query": request.query},
        }
    except Exception as exc:
        message = str(exc)
        logger.error("Search error", error=message)
        raise HTTPException(status_code=500, detail=message)