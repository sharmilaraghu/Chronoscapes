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
    music_duration_seconds: int = 30,
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

    prompt = f"""You are reconstructing lost historical music and soundscapes from newspaper evidence.

Your primary mission is to recreate the MUSIC of this era — the songs people actually sang, \
the melodies that filled these spaces. This is not background ambience; it is lost music being \
brought back to life.

Combine the input analyses into a single coherent scene and return a valid JSON object:
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
  "sfxPrompt": "<15-second ambient sound effects description for ElevenLabs SFX API — specific sounds described in the analyses>",
  "isVocal": true,
  "lyrics": "<4-6 line verse in the vernacular of the era, drawn from language and imagery in the passages>"
}}

VOCAL MUSIC RULES (isVocal):
- Default is true — historical music almost always had words. Parlor songs, work songs, \
marching anthems, jazz standards, big band ballads — these were vocal forms.
- Set isVocal to false ONLY when the scene is clearly non-musical: factory floors, weather \
disasters, crime blotters, outdoor chaos with zero social/gathering/performance signal.
- Any mention of singing, dancing, a performer, saloon, ballroom, church, parade, or crowd \
gathered socially → isVocal must be true.

LYRICS RULES (only when isVocal is true):
- Write exactly 4–6 lines — one verse, no chorus, no repetition markers.
- Draw language and imagery DIRECTLY from the passage texts. Use their actual words and \
phrases where possible; do not invent unrelated content.
- Write in the vernacular and emotional register of the era:
  - Gilded_Age → parlor song or folk ballad cadence, formal but tender
  - WWI → marching song or music hall anthem, stirring and direct
  - Jazz_Age → blues or Tin Pan Alley cadence, syncopated, wry or longing
  - WWII → big band ballad, sentimental, plain-spoken yearning
- No modern phrasing, no anachronisms.
- If isVocal is false, set lyrics to null.

GENERAL RULES:
- Prioritize sounds that appear across multiple inputs
- Do NOT introduce sounds not present in any input
- dominantSounds: 3-5 most prominent; secondarySounds: 2-4; backgroundSounds: 2-3
- musicPrompt and sfxPrompt: grounded in the actual inputs, no generic vintage clichés
- musicPrompt: BPM, specific instruments, emotional quality, historical style (under 500 chars)
- sfxPrompt: exact sounds from the analyses (under 500 chars)
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
        is_vocal=scene.isVocal,
        has_lyrics=scene.lyrics is not None,
        duration_ms=phase4_ms,
    )

    # ── ElevenLabs audio ────────────────────────────────────────────────────────
    logger.info(
        "ElevenLabs: starting generation",
        correlation_id=correlation_id,
        music_prompt_len=len(scene.musicPrompt),
        sfx_prompt_len=len(scene.sfxPrompt),
    )
    music_url, sfx_url = await generate_audio(
        scene.musicPrompt,
        scene.sfxPrompt,
        lyrics=scene.lyrics if scene.isVocal else None,
        instrumental=not scene.isVocal,
        duration_ms=music_duration_seconds * 1000,
    )
    logger.info(
        "ElevenLabs: generation complete",
        correlation_id=correlation_id,
        music_url_len=len(music_url),
        sfx_url_len=len(sfx_url),
    )

    return scene, music_url, sfx_url