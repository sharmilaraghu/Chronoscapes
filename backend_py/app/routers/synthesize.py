"""
POST /api/synthesize — Phase 4: synthesize scene + generate audio.
Rate-limited: 5 req/min per IP.
"""

import uuid
from fastapi import APIRouter, HTTPException, Request
from app.lib.logger import get_logger
from app.lib.types import SynthesizeRequest
from app.services.synthesize import synthesize_scene

router = APIRouter()
logger = get_logger("synthesize")


@router.post("/synthesize")
async def synthesize(request: SynthesizeRequest, http_request: Request):
    # Check for failed chunks
    failed = [a for a in request.analyses if a.error is True]
    if failed:
        logger.warn(
            "Synthesize attempted with failed chunks",
            failed_chunk_ids=[a.id for a in failed],
        )
        raise HTTPException(
            status_code=400,
            detail=f"Chunk(s) {[a.id for a in failed]} have analysis errors and cannot be synthesized",
        )

    correlation_id = str(uuid.uuid4())
    logger.info(
        "Synthesize request received",
        correlation_id=correlation_id,
        selected_chunk_ids=[a.id for a in request.analyses],
        city=request.city,
        era=request.era,
    )

    try:
        scene, music_url, sfx_url = await synthesize_scene(
            analyses=request.analyses,
            city=request.city,
            era=request.era,
            correlation_id=correlation_id,
            music_duration_seconds=request.musicDurationSeconds,
        )
        return {
            "success": True,
            "data": {
                "scene": scene.model_dump(),
                "musicUrl": music_url,
                "sfxUrl": sfx_url,
            },
            "metadata": {"correlationId": correlation_id},
        }
    except Exception as exc:
        message = str(exc)
        logger.error("Synthesize error", correlation_id=correlation_id, error=message)
        raise HTTPException(status_code=500, detail=message)