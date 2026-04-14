"""
Pydantic models matching frontend types exactly.
Frontend contract: frontend/src/lib/types.ts
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field


class SoundProfile(BaseModel):
    primary: list[str] = Field(default_factory=list)
    secondary: list[str] = Field(default_factory=list)
    environment: str = ""
    timeOfDay: str = ""
    intensity: str = ""


class ChunkAnalysis(BaseModel):
    id: str
    cleanTitle: str = ""
    summary: str = ""
    soundKeywords: list[str] = Field(default_factory=list)
    highlightPhrases: list[str] = Field(default_factory=list)
    soundProfile: SoundProfile = Field(default_factory=SoundProfile)
    error: Optional[bool] = None


class SynthesizedScene(BaseModel):
    sceneSummary: str = ""
    dominantSounds: list[str] = Field(default_factory=list)
    secondarySounds: list[str] = Field(default_factory=list)
    backgroundSounds: list[str] = Field(default_factory=list)
    environment: str = ""
    timeOfDay: str = ""
    acousticProfile: str = ""
    intensity: str = ""
    musicPrompt: str = ""
    sfxPrompt: str = ""


class AnalyzeResult(BaseModel):
    analyses: list[ChunkAnalysis] = Field(default_factory=list)
    mode: Literal["batch", "per_chunk", "partial"] = "batch"
    failedIds: list[str] = Field(default_factory=list)
    durationMs: int = 0
    truncationEvents: list[str] = Field(default_factory=list)


class Passage(BaseModel):
    id: str
    text: str
    title: str = ""
    date: str = ""
    location: str = ""
    year: int = 0
    era: Literal["Gilded_Age", "WWI", "Jazz_Age", "WWII"] = "Jazz_Age"
    score: Optional[float] = None


class ApiResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
    metadata: Optional[dict] = None


# ── Request schemas ────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=200)
    era: Optional[Literal["Gilded_Age", "WWI", "Jazz_Age", "WWII"]] = None
    location: Optional[str] = None
    year: Optional[int] = None
    limit: Optional[int] = Field(default=8, ge=1, le=20)


class AnalyzeRequest(BaseModel):
    passages: list[Passage] = Field(..., min_length=1, max_length=10)


class SynthesizeRequest(BaseModel):
    analyses: list[ChunkAnalysis] = Field(..., min_length=1, max_length=3)
    city: str = Field(..., min_length=1, max_length=100)
    era: Literal["Gilded_Age", "WWI", "Jazz_Age", "WWII"]