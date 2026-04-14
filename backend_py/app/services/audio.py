"""
ElevenLabs audio generation service.
Music: /v1/music/generate (binary response → base64 data URL)
SFX:  /v1/sound-generation (binary response → base64 data URL)
"""

import asyncio
import base64
import httpx
from app.config import settings
from app.lib.logger import get_logger

logger = get_logger("audio")


async def _elevenlabs_audio(endpoint: str, body: dict) -> str:
    """POST to ElevenLabs, return base64 data: URL."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"https://api.elevenlabs.io{endpoint}",
            json=body,
            headers={
                "Content-Type": "application/json",
                "xi-api-key": settings.ELEVENLABS_API_KEY,
            },
        )
    if not resp.is_success:
        logger.error("ElevenLabs API error", endpoint=endpoint, status=resp.status_code, body=resp.text)
        raise RuntimeError(f"ElevenLabs API error {resp.status_code}: {resp.text}")

    data = resp.content
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:audio/mpeg;base64,{b64}"


async def generate_music(prompt: str) -> str:
    """Generate 30s music clip, return data: URL."""
    logger.debug("Generating music", prompt_length=len(prompt))
    return await _elevenlabs_audio("/v1/music/generate", {
        "prompt": prompt,
        "music_length_ms": 30000,
    })


async def generate_sfx(prompt: str) -> str:
    """Generate 15s SFX clip, return data: URL."""
    logger.debug("Generating SFX", prompt_length=len(prompt))
    return await _elevenlabs_audio("/v1/sound-generation", {
        "text": prompt,
        "duration_seconds": 15,
        "prompt_influence": 0.5,
    })


async def generate_audio(music_prompt: str, sfx_prompt: str) -> tuple[str, str]:
    """Run music and SFX generation concurrently."""
    logger.info("ElevenLabs: starting generation", music_prompt_len=len(music_prompt), sfx_prompt_len=len(sfx_prompt))
    music_url, sfx_url = await asyncio.gather(
        generate_music(music_prompt),
        generate_sfx(sfx_prompt),
    )
    logger.info("ElevenLabs: generation complete", music_url_len=len(music_url), sfx_url_len=len(sfx_url))
    return music_url, sfx_url