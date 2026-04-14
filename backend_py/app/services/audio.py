"""
ElevenLabs audio generation service.
Music: /v1/music/generate (binary response → base64 data URL)
SFX:  /v1/sound-generation (binary response → base64 data URL)
"""

import asyncio
import base64
from typing import Optional
import httpx
from app.config import settings
from app.lib.logger import get_logger

logger = get_logger("audio")


async def _elevenlabs_audio(endpoint: str, body: dict, *, retries: int = 1) -> str:
    """POST to ElevenLabs, return base64 data: URL. Retries with sanitized prompt on rejection."""
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
        try:
            err_body = resp.json()
            # ElevenLabs may return a safe prompt suggestion on bad_prompt errors
            if (
                err_body.get("status") == "bad_prompt"
                and err_body.get("data", {}).get("prompt_suggestion")
                and retries > 0
            ):
                safe_prompt = err_body["data"]["prompt_suggestion"]
                logger.warning(
                    "ElevenLabs rejected original prompt, retrying with sanitized version",
                    original_prompt_len=len(body.get("prompt", body.get("text", ""))),
                    safe_prompt_len=len(safe_prompt),
                )
                return await _elevenlabs_audio(
                    endpoint,
                    {**body, "prompt" if endpoint == "/v1/music/generate" else "text": safe_prompt},
                    retries=0,
                )
        except Exception:
            pass
        logger.error("ElevenLabs API error", endpoint=endpoint, status=resp.status_code, body=resp.text)
        raise RuntimeError(f"ElevenLabs API error {resp.status_code}: {resp.text}")

    data = resp.content
    b64 = base64.b64encode(data).decode("ascii")
    return f"data:audio/mpeg;base64,{b64}"


async def generate_music(
    prompt: str,
    *,
    lyrics: Optional[str] = None,
    instrumental: bool = False,
    duration_ms: int = 30_000,
) -> str:
    """Generate a music clip of the given duration, return data: URL.

    If instrumental=True, forces no vocals via force_instrumental flag.
    If lyrics provided, appends them to the prompt for ElevenLabs to sing.
    duration_ms must be in 3_000–600_000 range (ElevenLabs limit).
    """
    full_prompt = prompt
    if not instrumental and lyrics:
        full_prompt = f"{prompt}\n\nLyrics:\n{lyrics}"

    body: dict = {
        "prompt": full_prompt,
        "music_length_ms": duration_ms,
    }
    if instrumental:
        body["force_instrumental"] = True

    logger.debug(
        "Generating music",
        prompt_length=len(full_prompt),
        duration_ms=duration_ms,
        instrumental=instrumental,
        has_lyrics=lyrics is not None,
    )
    return await _elevenlabs_audio("/v1/music/compose", body)


async def generate_sfx(prompt: str) -> str:
    """Generate 15s SFX clip, return data: URL."""
    logger.debug("Generating SFX", prompt_length=len(prompt))
    return await _elevenlabs_audio("/v1/sound-generation", {
        "text": prompt,
        "duration_seconds": 15,
        "prompt_influence": 0.5,
    })


async def generate_audio(
    music_prompt: str,
    sfx_prompt: str,
    *,
    lyrics: Optional[str] = None,
    instrumental: bool = False,
    duration_ms: int = 30_000,
) -> tuple[str, str]:
    """Run music and SFX generation concurrently."""
    logger.info(
        "ElevenLabs: starting generation",
        music_prompt_len=len(music_prompt),
        sfx_prompt_len=len(sfx_prompt),
        instrumental=instrumental,
        has_lyrics=lyrics is not None,
        duration_ms=duration_ms,
    )
    music_url, sfx_url = await asyncio.gather(
        generate_music(music_prompt, lyrics=lyrics, instrumental=instrumental, duration_ms=duration_ms),
        generate_sfx(sfx_prompt),
    )
    logger.info("ElevenLabs: generation complete", music_url_len=len(music_url), sfx_url_len=len(sfx_url))
    return music_url, sfx_url