"""
POST /api/analyze — Phase 1: batch analyze all passages with Gemini.
"""

import uuid
from fastapi import APIRouter, HTTPException
from app.lib.logger import get_logger
from app.lib.types import AnalyzeRequest
from app.services.analyze import analyze_chunks

router = APIRouter()
logger = get_logger("analyze")


@router.post("/analyze")
async def analyze(request: AnalyzeRequest):
    correlation_id = str(uuid.uuid4())

    logger.info(
        "Analyze request received",
        correlation_id=correlation_id,
        chunk_count=len(request.passages),
        passage_ids=[p.id for p in request.passages],
    )

    # Validate text lengths
    oversized = [p for p in request.passages if len(p.text) > 10000]
    if oversized:
        logger.warning("Oversized chunks", correlation_id=correlation_id, oversized=[p.id for p in oversized])
        raise HTTPException(
            status_code=400,
            detail=f"Chunk(s) {[p.id for p in oversized]} exceed 10000 character limit",
        )

    try:
        result = await analyze_chunks(request.passages, correlation_id)
        logger.info(
            "Analyze request complete",
            correlation_id=correlation_id,
            analyzed_count=len(result.analyses),
            failed_count=len(result.failedIds),
            mode=result.mode,
            duration_ms=result.durationMs,
            truncation_events=result.truncationEvents,
        )
        return {
            "success": True,
            "data": result.model_dump(),
            "metadata": {"correlationId": correlation_id},
        }
    except Exception as exc:
        message = str(exc)
        logger.error("Analyze error", correlation_id=correlation_id, error=message)
        raise HTTPException(status_code=500, detail=message)