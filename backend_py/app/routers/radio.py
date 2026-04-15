"""
POST /api/radio/next — Chrono Radio continuous stream.
Full pipeline: search → analyze → synthesize (90s) → DJ script → TTS.
Rate-limited: shared default 5 req/min per IP.
"""

import uuid
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.lib.logger import get_logger
from app.services.analyze import analyze_chunks
from app.services.dj_script import generate_dj_script
from app.services.search import search_passages
from app.services.synthesize import synthesize_scene
from app.services.tts import generate_dj_tts

router = APIRouter()
logger = get_logger("radio")


class RadioNextRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=200)
    era: Optional[Literal["Gilded_Age", "WWI", "Jazz_Age", "WWII"]] = None
    previousSummary: Optional[str] = Field(None, max_length=500)
    trackNumber: int = Field(1, ge=1)


@router.post("/radio/next")
async def radio_next(request: RadioNextRequest, http_request: Request):
    """
    Generate one complete Chrono Radio track:
    1. Search turbopuffer for historical passages
    2. Analyze passages for sound keywords
    3. Synthesize a 90s music track + SFX
    4. Generate an era-appropriate DJ intro script + TTS
    Returns { ttsUrl, musicUrl, sfxUrl, scene, djScript }
    """
    correlation_id = str(uuid.uuid4())
    logger.info(
        "Radio: next track request",
        correlation_id=correlation_id,
        query=request.query[:60],
        era=request.era,
    )

    # 1. Search — era filter is optional; if omitted, search all eras
    passages = search_passages(query=request.query, era=request.era, limit=10)
    if not passages:
        raise HTTPException(status_code=404, detail="No historical passages found for this query")

    # Derive city and era from results when not provided
    city = _most_common_city(passages)
    era = request.era or _most_common_era(passages)

    # 2. Analyze
    try:
        analyze_result = await analyze_chunks(passages, correlation_id=correlation_id)
    except Exception as exc:
        logger.error("Radio: analyze failed", correlation_id=correlation_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Analysis step failed")

    # 3. Auto-select top 3 chunks by sound keyword count, skip errored ones
    valid = [a for a in analyze_result.analyses if not a.error]
    if not valid:
        raise HTTPException(status_code=500, detail="All passage analyses failed")
    selected = sorted(valid, key=lambda a: len(a.soundKeywords), reverse=True)[:6]

    # 4. Synthesize scene + 90s music (music and SFX run concurrently inside synthesize_scene)
    try:
        scene, music_url, sfx_url = await synthesize_scene(
            analyses=selected,
            city=city,
            era=era,
            correlation_id=correlation_id,
            music_duration_seconds=90,
        )
    except Exception as exc:
        logger.error("Radio: synthesize failed", correlation_id=correlation_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Audio synthesis failed")

    # 5. Generate DJ script then TTS (sequential: TTS depends on script)
    try:
        dj_script = await generate_dj_script(
            scene_summary=scene.sceneSummary,
            city=city,
            era=era,
            track_number=request.trackNumber,
            previous_summary=request.previousSummary,
            correlation_id=correlation_id,
        )
        tts_url = await generate_dj_tts(
            script=dj_script,
            era=era,
            correlation_id=correlation_id,
        )
    except Exception as exc:
        logger.error("Radio: TTS failed", correlation_id=correlation_id, error=str(exc))
        raise HTTPException(status_code=500, detail="DJ intro generation failed")

    logger.info("Radio: track ready", correlation_id=correlation_id, city=city)

    return {
        "success": True,
        "data": {
            "ttsUrl": tts_url,
            "musicUrl": music_url,
            "sfxUrl": sfx_url,
            "scene": scene.model_dump(),
            "djScript": dj_script,
            "city": city,
        },
        "metadata": {"correlationId": correlation_id},
    }


def _most_common_city(passages: list) -> str:
    """Return the city that appears most frequently in the passage set."""
    from collections import Counter
    cities = [p.location.split(",")[0].strip() for p in passages if p.location]
    if not cities:
        return "the city"
    return Counter(cities).most_common(1)[0][0]


def _most_common_era(passages: list) -> str:
    """Return the era that appears most frequently in the passage set."""
    from collections import Counter
    eras = [p.era for p in passages if p.era]
    if not eras:
        return "Jazz_Age"
    return Counter(eras).most_common(1)[0][0]
