"""
Phase 1: Batch analyze all passages with Gemini Flash 2.5.
Attempts batch first, falls back to per-chunk on failure.
"""

import asyncio
import json
import time
import uuid
from typing import Optional
from google import genai
from app.config import settings
from app.lib.logger import get_logger
from app.lib.types import Passage, ChunkAnalysis, AnalyzeResult

logger = get_logger("analyze")

MAX_CHARS = 2000

_client = None


def _gemini_client():
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.must_have_gemini())
    return _client


async def analyze_chunks(passages: list[Passage], correlation_id: Optional[str] = None) -> AnalyzeResult:
    """
    Phase 1: Analyze all passages in one batch Gemini call.
    Falls back to per-chunk processing if batch fails.
    Returns mode, failedIds, truncationEvents for debug visibility.
    """
    correlation_id = correlation_id or str(uuid.uuid4())
    start_ms = int(time.time() * 1000)
    truncation_events: list[str] = []

    # Truncate long passages
    processed = []
    for p in passages:
        if len(p.text) > MAX_CHARS:
            truncation_events.append(f"{p.id}: {len(p.text)} -> {MAX_CHARS}")
            processed.append(Passage(
                id=p.id, text=p.text[:MAX_CHARS], title=p.title,
                date=p.date, location=p.location, year=p.year, era=p.era,
            ))
        else:
            processed.append(p)

    estimated_tokens = sum(len(p.text) for p in processed) // 4

    logger.info(
        "Phase 1: starting chunk analysis",
        correlation_id=correlation_id,
        chunk_count=len(processed),
        estimated_tokens=estimated_tokens,
        mode="batch",
    )

    # Try batch first
    try:
        analyses = await _batch_analyze(processed, correlation_id)
        duration_ms = int(time.time() * 1000) - start_ms
        logger.info(
            "Phase 1: batch complete",
            correlation_id=correlation_id,
            mode="batch",
            analyzed=len(analyses),
            failed=0,
            duration_ms=duration_ms,
            truncation_events=truncation_events,
        )
        return AnalyzeResult(
            analyses=analyses,
            mode="batch",
            failedIds=[],
            durationMs=duration_ms,
            truncationEvents=truncation_events,
        )
    except Exception as exc:
        logger.warning(
            "Phase 1: batch failed, falling back to per-chunk",
            correlation_id=correlation_id,
            reason=str(exc),
            chunks_attempted=len(processed),
        )
        # Per-chunk fallback
        results = await asyncio.gather(
            *[_analyze_single(p, correlation_id) for p in processed],
            return_exceptions=True,
        )
        analyses: list[ChunkAnalysis] = []
        failed_ids: list[str] = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                failed_ids.append(processed[i].id)
                logger.error(
                    "Phase 1: chunk failed",
                    correlation_id=correlation_id,
                    chunk_id=processed[i].id,
                    error=str(result),
                )
            else:
                analyses.append(result)

        mode: str = "partial" if len(analyses) < len(processed) else "per_chunk"
        duration_ms = int(time.time() * 1000) - start_ms
        logger.info(
            "Phase 1: per-chunk fallback complete",
            correlation_id=correlation_id,
            mode=mode,
            analyzed=len(analyses),
            failed=len(failed_ids),
            duration_ms=duration_ms,
        )
        return AnalyzeResult(
            analyses=analyses,
            mode=mode,
            failedIds=failed_ids,
            durationMs=duration_ms,
            truncationEvents=truncation_events,
        )


async def _batch_analyze(passages: list[Passage], correlation_id: str) -> list[ChunkAnalysis]:
    """Send all chunks to Gemini in a single batch request."""
    chunks_input = "\n".join(
        json.dumps({"id": p.id, "text": p.text, "headline": p.title, "year": p.year, "city": p.location})
        for p in passages
    )

    prompt = (
        "You are processing noisy OCR historical text for a sound reconstruction system.\n"
        "\n"
        "Analyze each input chunk and return structured data.\n"
        "\n"
        'Return a valid JSON object with an "analyses" array. For EACH chunk, return:\n'
        "{\n"
        '  "id": "<chunk id>",\n'
        '  "cleanTitle": "<cleaned headline, max 80 chars>",\n'
        '  "summary": "<1 short sentence, cleaned and readable>",\n'
        '  "soundKeywords": ["<keyword1>", ...],\n'
        '  "highlightPhrases": ["<short quote from text>", ...],\n'
        '  "soundProfile": {\n'
        '    "primary": ["<main sound 1>", ...],\n'
        '    "secondary": ["<secondary sound 1>", ...],\n'
        '    "environment": "<urban|rustic|indoor|outdoor|etc>",\n'
        '    "timeOfDay": "<dawn|morning|afternoon|evening|night|late_night>",\n'
        '    "intensity": "<quiet|moderate|loud|bustling>"\n'
        "  }\n"
        "}\n"
        "\n"
        "Rules:\n"
        "- cleanTitle: remove OCR artifacts, keep readable\n"
        "- summary: max 1 sentence, describe what happened (not what was written)\n"
        "- soundKeywords: ONLY sounds present in the text (music, crowd, vehicles, nature, etc.) - max 5 items\n"
        "- highlightPhrases: exact short quotes (1-5 words) from text that describe sounds - max 3\n"
        "- DO NOT invent sounds not in the text\n"
        "- If a chunk has no clear sounds, set soundKeywords to [] and explain in summary\n"
        '- Return valid JSON with "analyses" key at the top level\n'
        "- Include ALL chunks in the analyses array, in the same order received\n"
        "\n"
        "INPUT:\n"
        "[\n"
        + chunks_input
        + "\n]"
    )

    client = _gemini_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={
            "max_output_tokens": 8192,
            "temperature": 0.5,
            "thinking_config": {"thinking_budget": 0},
        },
    )

    raw = response.text or ""
    match = _extract_json(raw)
    if not match:
        raise ValueError(f"Gemini did not return a JSON object. Raw: {raw[:300]}")

    parsed = json.loads(match)
    analyses_raw = parsed.get("analyses", [])
    return [
        ChunkAnalysis(
            id=a["id"],
            cleanTitle=a.get("cleanTitle", ""),
            summary=a.get("summary", ""),
            soundKeywords=a.get("soundKeywords", []),
            highlightPhrases=a.get("highlightPhrases", []),
            soundProfile=a.get("soundProfile", {}),
        )
        for a in analyses_raw
    ]


async def _analyze_single(passage: Passage, correlation_id: str) -> ChunkAnalysis:
    """Analyze a single chunk - fallback when batch fails."""
    prompt = (
        "You are processing noisy OCR historical text for a sound reconstruction system.\n"
        "\n"
        "Analyze this chunk and return structured data.\n"
        "\n"
        "Return a valid JSON object:\n"
        "{\n"
        '  "cleanTitle": "<cleaned headline, max 80 chars>",\n'
        '  "summary": "<1 short sentence, cleaned and readable>",\n'
        '  "soundKeywords": ["<keyword1>", ...],\n'
        '  "highlightPhrases": ["<short quote from text>", ...],\n'
        '  "soundProfile": {\n'
        '    "primary": ["<main sound 1>", ...],\n'
        '    "secondary": ["<secondary sound 1>", ...],\n'
        '    "environment": "<urban|rustic|indoor|outdoor|etc>",\n'
        '    "timeOfDay": "<dawn|morning|afternoon|evening|night|late_night>",\n'
        '    "intensity": "<quiet|moderate|loud|bustling>"\n'
        "  }\n"
        "}\n"
        "\n"
        "INPUT:\n"
        f"Headline: {passage.title}\n"
        f"Text: {passage.text[:2000]}\n"
        f"Year: {passage.year}\n"
        f"Location: {passage.location}\n"
        "\n"
        "Rules:\n"
        "- cleanTitle: remove OCR artifacts\n"
        "- soundKeywords: ONLY sounds present - max 5\n"
        "- highlightPhrases: exact short quotes from text - max 3\n"
        "- DO NOT invent sounds not in the text"
    )

    client = _gemini_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={
            "max_output_tokens": 4096,
            "temperature": 0.5,
            "thinking_config": {"thinking_budget": 0},
        },
    )

    raw = response.text or ""
    match = _extract_json(raw)
    if not match:
        raise ValueError(f"Gemini did not return structured JSON for chunk {passage.id}")

    a = json.loads(match)
    return ChunkAnalysis(
        id=passage.id,
        cleanTitle=a.get("cleanTitle", ""),
        summary=a.get("summary", ""),
        soundKeywords=a.get("soundKeywords", []),
        highlightPhrases=a.get("highlightPhrases", []),
        soundProfile=a.get("soundProfile", {}),
    )


def _extract_json(raw: str) -> Optional[str]:
    """Find first JSON object in response text."""
    import re
    m = re.search(r"\{[\s\S]*\}", raw)
    return m.group(0) if m else None
