"""
Phase 4: Synthesize selected chunks into scene + audio prompts, then generate audio.
Uses Gemini Flash 2.5 for synthesis, ElevenLabs for audio generation.
"""

import json
import time
import uuid
from typing import Optional
from google import genai
from app.config import settings
from app.lib.logger import get_logger
from app.lib.types import ChunkAnalysis, SynthesizedScene
from app.services.analyze import _gemini_client
from app.services.audio import generate_audio

logger = get_logger("synthesize")


async def synthesize_scene(
    analyses: list[ChunkAnalysis],
    city: str,
    era: str,
    correlation_id: Optional[str] = None,
) -> tuple[SynthesizedScene, str, str]:
    """
    Phase 4: Merge selected chunks into a coherent soundscape + audio.
    Returns (scene, musicUrl, sfxUrl).
    """
    correlation_id = correlation_id or str(uuid.uuid4())

    logger.info(
        "Phase 4: starting scene synthesis",
        correlation_id=correlation_id,
        selected_chunk_ids=[a.id for a in analyses],
        chunk_count=len(analyses),
        city=city,
        era=era,
    )

    # ── LLM call ────────────────────────────────────────────────────────────────
    input_json = "\n".join(
        json.dumps({
            "id": a.id,
            "summary": a.summary,
            "soundKeywords": a.soundKeywords,
            "soundProfile": a.soundProfile.model_dump() if hasattr(a.soundProfile, "model_dump") else a.soundProfile,
            "highlightPhrases": a.highlightPhrases,
        })
        for a in analyses
    )

    prompt = f"""You are reconstructing a historical soundscape from structured evidence.

Combine the input analyses into a single coherent soundscape for audio generation.

Return a valid JSON object:
{{
  "sceneSummary": "<2-3 sentence description of the scene>",
  "dominantSounds": ["<sound that defines the scene>", ...],
  "secondarySounds": ["<supporting ambient sounds>", ...],
  "backgroundSounds": ["<distant/nearly inaudible sounds>", ...],
  "environment": "<urban|rustic|industrial|residential|etc>",
  "timeOfDay": "<dawn|morning|afternoon|evening|night>",
  "acousticProfile": "<e.g. echoic urban canyon, open rural, enclosed parlor>",
  "intensity": "<quiet|moderate|loud|bustling>",
  "musicPrompt": "<30-second era-accurate music description for ElevenLabs Music API — include tempo (BPM), key instruments, emotional tone, historical period style>",
  "sfxPrompt": "<15-second ambient sound effects description for ElevenLabs SFX API — specific sounds described in the analyses (e.g. horse-drawn carriages, jazz band, rain on windows)>"
}}

Rules:
- Prioritize sounds that appear across multiple inputs
- Do NOT introduce sounds not present in any input
- dominantSounds: what you hear first and most prominently (3-5 sounds)
- secondarySounds: supporting ambient sounds (2-4 sounds)
- backgroundSounds: distant/ambient layer (2-3 sounds)
- musicPrompt and sfxPrompt: grounded in the actual inputs, no generic vintage clichés
- musicPrompt: mention BPM, specific instruments, emotional quality, historical style
- sfxPrompt: list exact sounds from the analyses
- Keep prompts under 500 characters each
- era context: {era}, location: {city}

INPUT:
[
{input_json}
]"""

    start_ms = int(time.time() * 1000)
    client = _gemini_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={
            "max_output_tokens": 4096,
            "temperature": 0.7,
            "thinking_config": {"thinking_budget": 0},
        },
    )

    raw = response.text or ""
    import re
    match = re.search(r"\{[\s\S]*\}", raw)
    if not match:
        raise ValueError(f"Gemini did not return a JSON object. Raw: {raw[:300]}")

    parsed = json.loads(match.group(0))
    scene = SynthesizedScene(**parsed)

    phase4_ms = int(time.time() * 1000) - start_ms
    logger.info(
        "Phase 4: synthesis complete",
        correlation_id=correlation_id,
        scene_summary=scene.sceneSummary[:50],
        dominant_sounds=len(scene.dominantSounds),
        secondary_sounds=len(scene.secondarySounds),
        background_sounds=len(scene.backgroundSounds),
        duration_ms=phase4_ms,
    )

    # ── ElevenLabs audio ────────────────────────────────────────────────────────
    logger.info(
        "ElevenLabs: starting generation",
        correlation_id=correlation_id,
        music_prompt_len=len(scene.musicPrompt),
        sfx_prompt_len=len(scene.sfxPrompt),
    )
    music_url, sfx_url = await generate_audio(scene.musicPrompt, scene.sfxPrompt)
    logger.info(
        "ElevenLabs: generation complete",
        correlation_id=correlation_id,
        music_url_len=len(music_url),
        sfx_url_len=len(sfx_url),
    )

    return scene, music_url, sfx_url