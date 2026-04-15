"""
DJ script generation service.
Uses Gemini Flash 2.5 to write era-appropriate radio jockey intros.
Track 1 → welcome/opening intro.
Track 2+ → transition: references what just played, pivots to what's next.
"""

import uuid
from typing import Optional
from app.services.analyze import _gemini_client
from app.lib.logger import get_logger

logger = get_logger("dj_script")

_ERA_PERSONA = {
    "Gilded_Age": (
        "You are a formal Victorian radio announcer broadcasting in the 1880s–1900s. "
        "Speak with ornate, elevated diction. Reference parlor culture and refined society."
    ),
    "WWI": (
        "You are a wartime radio broadcaster in 1914–1918. "
        "Speak with direct, rallying energy — clipped sentences, patriotic warmth."
    ),
    "Jazz_Age": (
        "You are a hip, breezy radio host spinning records in the roaring 1920s. "
        "Speak with casual snap and wit — 'Hey there, cats...' or 'Step right up, friends...'. "
        "Reference speakeasies, hot jazz, and the electric city."
    ),
    "WWII": (
        "You are a warm, reassuring radio broadcaster in the 1940s. "
        "Speak with plain-spoken sincerity and gentle optimism."
    ),
}


async def generate_dj_script(
    scene_summary: str,
    city: str,
    era: str,
    track_number: int = 1,
    previous_summary: Optional[str] = None,
    correlation_id: Optional[str] = None,
) -> str:
    """
    Generate a DJ intro for the next track.
    Track 1: welcome-style opener.
    Track 2+: transition — briefly acknowledges what just played, then introduces what's next.
    Returns plain text (no JSON).
    """
    correlation_id = correlation_id or str(uuid.uuid4())
    persona = _ERA_PERSONA.get(era, _ERA_PERSONA["Jazz_Age"])

    if track_number == 1:
        prompt = f"""{persona}

Write an opening radio introduction (2–3 sentences, 40–80 words) welcoming listeners to the broadcast.
- Set the scene in {city}
- Build anticipation for what's about to play — do NOT describe the music explicitly
- Speak in the first person as the radio host
- Output ONLY the spoken script, no quotes, no stage directions

Upcoming scene: {scene_summary}"""
    else:
        prev_context = (
            f"What just played: {previous_summary}" if previous_summary
            else "A previous track just finished."
        )
        prompt = f"""{persona}

You are live on air. A track just finished and you are introducing the next one.
Write a smooth on-air transition (2–3 sentences, 40–80 words).
- Briefly acknowledge or react to what just played (one sentence max)
- Then pivot: "The next track takes us to..." or "Coming up next..." or similar
- Reference the new scene in {city} — set the mood without describing the music directly
- Speak in the first person as the radio host
- Output ONLY the spoken script, no quotes, no stage directions

{prev_context}
Upcoming scene: {scene_summary}"""

    client = _gemini_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={
            "max_output_tokens": 256,
            "temperature": 0.9,
            "thinking_config": {"thinking_budget": 0},
        },
    )

    script = (response.text or "").strip()
    if not script:
        raise RuntimeError("DJ script generation returned empty response")

    logger.info(
        "DJ script generated",
        correlation_id=correlation_id,
        era=era,
        city=city,
        track_number=track_number,
        has_previous=previous_summary is not None,
        script_length=len(script),
    )
    return script
