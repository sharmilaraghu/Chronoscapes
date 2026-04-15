"""
ElevenLabs Text-to-Speech service for radio jockey intros.
POST /v1/text-to-speech/{voice_id} → base64 data: URL (audio/mpeg).
"""

import base64
import uuid
from typing import Optional
import httpx
from app.config import settings
from app.lib.logger import get_logger

logger = get_logger("tts")

VOICE_ID = "Q1QcmfZPmFDVUWmzASdy"

_ERA_VOICE_SETTINGS: dict[str, dict] = {
    "Gilded_Age": {"stability": 0.60, "similarity_boost": 0.75, "style": 0.15, "use_speaker_boost": True},
    "WWI":        {"stability": 0.55, "similarity_boost": 0.70, "style": 0.20, "use_speaker_boost": True},
    "Jazz_Age":   {"stability": 0.45, "similarity_boost": 0.80, "style": 0.35, "use_speaker_boost": True},
    "WWII":       {"stability": 0.50, "similarity_boost": 0.75, "style": 0.25, "use_speaker_boost": True},
}


async def generate_dj_tts(
    script: str,
    era: str,
    correlation_id: Optional[str] = None,
) -> str:
    """
    Convert a DJ script to speech via ElevenLabs TTS.
    Returns a base64 data: URL (data:audio/mpeg;base64,...).
    """
    correlation_id = correlation_id or str(uuid.uuid4())
    voice_settings = _ERA_VOICE_SETTINGS.get(era, _ERA_VOICE_SETTINGS["Jazz_Age"])

    body = {
        "text": script,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": voice_settings,
    }

    logger.info(
        "TTS: generating DJ intro",
        correlation_id=correlation_id,
        era=era,
        script_length=len(script),
        voice_id=VOICE_ID,
    )

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}",
            json=body,
            headers={
                "Content-Type": "application/json",
                "xi-api-key": settings.ELEVENLABS_API_KEY,
            },
        )

    if not resp.is_success:
        logger.error(
            "TTS: ElevenLabs error",
            correlation_id=correlation_id,
            status=resp.status_code,
            body=resp.text[:200],
        )
        raise RuntimeError(f"ElevenLabs TTS error {resp.status_code}: {resp.text[:200]}")

    b64 = base64.b64encode(resp.content).decode("ascii")
    data_url = f"data:audio/mpeg;base64,{b64}"

    logger.info(
        "TTS: generation complete",
        correlation_id=correlation_id,
        output_bytes=len(resp.content),
    )
    return data_url
