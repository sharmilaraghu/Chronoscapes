# Chronoscapes — Acoustic Time Travel

> Query historical newspaper archives and hear the soundscapes of the past — generated live by AI.

Chronoscapes is a hackathon demo showcasing **turbopuffer** for vector search at scale, **ElevenLabs** for real-time music and sound effect generation, and **Google Gemini** for multi-stage AI synthesis. It reconstructs lost historical soundscapes from plain-text newspaper archives.

---

## What is this?

Type a place and era — e.g. *"Harlem 1925"* — and Chronoscapes queries a semantic archive of **4.47 million** historical newspaper passages. Gemini extracts the sounds described in the text, and ElevenLabs generates an era-accurate 30-second music clip plus ambient sound effects, played back through a vintage radio UI.

Built for the **turbopuffer + ElevenLabs hackathon**.

---

## Architecture

```
User query (e.g. "Harlem 1920s at night")
        │
        ▼
┌──────────────────────────────────┐
│  1. EMBEDDING                    │
│  Query → all-MiniLM-L6-v2        │
│  (384-dim, normalized vectors)   │
│  BGE query prefix applied        │
└──────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────┐
│  2. turbopuffer ANN SEARCH                        │
│  Namespace: chronoscopes-v2  │  Region: aws-us-east-1
│  Top-8 passages returned                            │
│  Cold: ~500ms  │  Warm (NVMe cache): ~8ms           │
└──────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│  3. GEMINI FLASH 2.5 — BATCH     │
│  Analyzes all passages in one call│
│  Extracts: cleanTitle, summary,  │
│  soundKeywords, highlightPhrases, │
│  soundProfile (primary/secondary, │
│  environment, timeOfDay, intensity)│
└──────────────────────────────────┘
        │
        ▼
        Top 3 passages auto-selected
        (most sound-rich by keyword count)
        User can toggle selection
        │
        ▼
┌──────────────────────────────────┐
│  4. GEMINI FLASH 2.5 — SYNTHESIS  │
│  Combines selected chunks into a  │
│  coherent SynthesizedScene:       │
│  sceneSummary, dominantSounds,    │
│  secondarySounds, backgroundSounds│
│  musicPrompt (<500 chars, w/ BPM, │
│  instruments, era style)          │
│  sfxPrompt (<500 chars, exact     │
│  sounds from source text)        │
└──────────────────────────────────┘
        │
        ├──────────────────────────┐
        ▼                          ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│  ELEVENLABS MUSIC API    │  │  ELEVENLABS SOUND FX    │
│  POST /v1/music/generate │  │  POST /v1/sound-generation│
│  30-second clip         │  │  15-second clip           │
│  era-accurate melody     │  │  ambient soundscape        │
│  (concurrent)            │  │  (concurrent)             │
└─────────────────────────┘  └─────────────────────────┘
        │                          │
        └────────────┬───────────┘
                     ▼
         ┌────────────────────────┐
         │  Web Audio API         │
         │  Real-time waveform    │
         │  Auto-play on load     │
         │  Download button       │
         └────────────────────────┘
```

---

## Data Scale

| Metric | Value |
|--------|-------|
| **Vectors in turbopuffer** | **~4.47 million** |
| **Dataset** | AmericanStories (`gustavecortal/american-stories-sample`) |
| **Vector dimension** | 384 (all-MiniLM-L6-v2) |
| **Namespace** | `chronoscopes-v2` |
| **Era coverage** | Gilded Age · WWI · Jazz Age · WWII |
| **Cold query latency** | ~500ms |
| **Warm cache latency** | ~8ms |
| **Top-K returned** | 8 passages per query |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · Leaflet |
| **Backend** | Python · FastAPI · Uvicorn · Pydantic |
| **Vector DB** | **turbopuffer** (ANN search, `chronoscopes-v2`) |
| **Embeddings** | sentence-transformers (all-MiniLM-L6-v2) or OpenRouter fallback |
| **LLM** | Google Gemini Flash 2.5 (batch analysis + scene synthesis) |
| **Music** | ElevenLabs Music API (`/v1/music/generate`, 30s) |
| **SFX** | ElevenLabs Sound Effects API (`/v1/sound-generation`, 15s) |
| **Rate limiting** | SlowAPI (5 req/min per IP on `/api/synthesize`) |

---

## Features

- **Semantic archive search** — natural language queries against 4.47M historical newspaper vectors
- **Era filtering** — restrict results to Gilded Age, WWI, Jazz Age, or WWII
- **Batch LLM analysis** — Gemini Flash 2.5 processes all passages in a single call
- **Per-chunk fallback** — if batch fails, falls back to parallel per-chunk processing
- **Scene synthesis** — Gemini combines selected passages into a coherent soundscape description
- **Concurrent audio generation** — ElevenLabs music + SFX generated simultaneously
- **Auto-retry on bad prompt** — if ElevenLabs rejects a prompt, retries with their sanitized suggestion
- **Real-time waveform visualization** — Web Audio API `AnalyserNode` drives canvas waveform
- **Vintage newspaper UI** — dispatch cards with halftone overlays, parchment textures, era badges
- **Audio download** — save generated music as `chronoscape-music.mp3`
- **Responsive layout** — on audio-ready state, map collapses and audio player takes center stage

---

## Screenshots

> **TODO: Add UI screenshot here**
>
> Screenshot should show: the vintage radio audio player with waveform, dispatch cards on the right, and the reconstructed scene panel below the radio.

---

## Quick Start

```bash
# Clone and start both servers
./start.sh

# Backend runs on http://localhost:8000
# Frontend runs on http://localhost:5173
```

Or manually:

```bash
# Backend
cd backend_py
pip install -r requirements.txt
python3 -m uvicorn app.main:app --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

---

## Environment Variables

Create `backend_py/.env` (see `backend_py/.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key |
| `TURBOPUFFER_API_KEY` | Yes | turbopuffer API key |
| `TURBOPUFFER_NAMESPACE` | Yes | Namespace (`chronoscopes-v2`) |
| `TURBOPUFFER_REGION` | Yes | Region (`aws-us-east-1`) |
| `HF_TOKEN` | Optional | HuggingFace token for faster model downloads |
| `USE_OPENROUTER` | No | Set `true` to use OpenRouter for embeddings instead of local sentence-transformers |
| `OPENROUTER_API_KEY` | Optional | OpenRouter API key (required if `USE_OPENROUTER=true`) |
| `CORS_ORIGINS` | No | Allowed CORS origins (default: `http://localhost:5173`) |
| `RATE_LIMIT_PER_MINUTE` | No | Rate limit for `/api/synthesize` (default: `5`) |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check + turbopuffer cache warm-up |
| `POST` | `/api/search` | ANN vector search → top-8 passages |
| `POST` | `/api/analyze` | Gemini batch analysis of passages |
| `POST` | `/api/synthesize` | Scene synthesis + ElevenLabs audio generation |

All responses use the envelope: `{"success": true, "data": {...}}`

---

## Project Structure

```
Chronoscapes/
├── start.sh                 # Concurrent backend + frontend startup
├── README.md                 # This file
├── CLAUDE.md                 # Claude Code configuration
├── backend_py/               # Python FastAPI backend
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, rate limit, lifespan
│   │   ├── config.py        # Pydantic Settings from .env
│   │   ├── routers/         # health, search, analyze, synthesize
│   │   ├── services/        # embeddings, search, analyze, synthesize, audio
│   │   └── lib/             # types, logger
│   └── .env.example
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx          # Main app, state machine, layout
│   │   ├── hooks/           # useChronoscape, useAudio
│   │   ├── components/       # AudioPlayer, ReconstructedScene, DispatchCard, etc.
│   │   └── lib/             # api client, types
│   └── package.json
└── .backup/                  # Retired TypeScript/Hono backend (reference only)
```

---

## Built with

- [**turbopuffer**](https://turbopuffer.com) — ANN vector search at scale
- [**ElevenLabs Music API**](https://elevenlabs.io) — era-accurate music generation
- [**ElevenLabs Sound Effects API**](https://elevenlabs.io) — ambient soundscape synthesis
- [**Google Gemini Flash 2.5**](https://ai.google.dev) — batch analysis + scene synthesis
- [**HuggingFace sentence-transformers**](https://huggingface.co/sentence-transformers) — local embeddings
- [**Leaflet**](https://leafletjs.com) — interactive map with vintage styling