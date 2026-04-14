# Chronoscapes — Music from the Lost Ages

> What did a Harlem jazz club sound like in 1925? What songs filled a London street during the Blitz?
> Chronoscapes brings that music back.

Centuries of music were never recorded. The only evidence that it existed at all is buried in the text of old newspapers — reviews of performances, advertisements for dance halls, dispatches from the front describing soldiers singing around fires. Chronoscapes reads those archives and recreates the music they describe: complete with lyrics written in the vernacular of the era, melody shaped by the instruments and rhythms the passages mention, and ambient sound layered beneath it.

No recordings. No samples. Just historical evidence, AI synthesis, and ElevenLabs turning it into sound.

---

## How it works

You type a place and a time — *"Chicago, 1919"* or *"London, 1940"* — and Chronoscapes searches a semantic index of **4.47 million** historical newspaper passages from the AmericanStories dataset. The passages that come back aren't random: they're the ones whose language is closest to your query, ranked by vector similarity across nearly five million archived articles.

From there, the pipeline runs in four stages:

**1. Archive search** — Your query is embedded and matched against turbopuffer's ANN index. The top-8 most semantically relevant passages are returned, often describing performances, street life, dances, wartime gatherings, or the specific sounds of a neighborhood.

**2. Sound analysis** — Gemini Flash 2.5 reads every passage and extracts what it actually says about sound: what instruments were playing, what people were singing, what the environment felt like, what time of day it was. This is grounded extraction — the model is instructed not to invent anything not present in the text.

**3. Scene synthesis** — The most sound-rich passages are combined into a coherent scene. Gemini decides whether the content calls for vocal music or instrumental, writes era-appropriate lyrics drawn from the language of the source articles, and produces both a music prompt and a sound effects prompt for ElevenLabs.

**4. Audio generation** — ElevenLabs generates a music track and a separate ambient SFX layer concurrently. The music is the reconstruction: lyrics written in Tin Pan Alley cadence for a Jazz Age saloon, or marching-song meter for a WWI dispatch. The SFX layer adds the room — the crowd, the rain, the traffic, the machinery.

The result plays back through a vintage radio UI with a real-time waveform.

---

## Architecture

```
User query  (e.g. "Harlem 1920s at night")
        │
        ▼
┌──────────────────────────────────┐
│  1. EMBEDDING                    │
│  all-MiniLM-L6-v2 (384-dim)      │
│  BGE query prefix applied        │
└──────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────┐
│  2. turbopuffer ANN SEARCH                        │
│  Namespace: chronoscopes-v2  │  aws-us-east-1     │
│  Top-8 passages returned                          │
│  Cold: ~500ms  │  Warm (NVMe cache): ~8ms         │
└──────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────┐
│  3. GEMINI FLASH 2.5 — BATCH     │
│  One call, all passages          │
│  Extracts: soundKeywords,        │
│  highlightPhrases, soundProfile  │
│  (environment, timeOfDay,        │
│  intensity, primary/secondary)   │
└──────────────────────────────────┘
        │
        Top 3 auto-selected by sound richness
        User can adjust selection (1–3 passages)
        │
        ▼
┌──────────────────────────────────────────────────┐
│  4. GEMINI FLASH 2.5 — SYNTHESIS                  │
│  Merges selected passages into SynthesizedScene   │
│  Decides: vocal or instrumental?                  │
│  If vocal: writes era-appropriate lyrics          │
│  drawn from actual passage language               │
│  Produces: musicPrompt + sfxPrompt                │
└──────────────────────────────────────────────────┘
        │
        ├──────────────────────────────┐
        ▼                              ▼
┌───────────────────────┐   ┌─────────────────────────┐
│  ELEVENLABS MUSIC API │   │  ELEVENLABS SFX API     │
│  /v1/music/compose    │   │  /v1/sound-generation   │
│  30 / 60 / 90 sec     │   │  15-second ambient clip │
│  lyrics embedded      │   │  exact sounds from text │
│  force_instrumental   │   │  (concurrent)           │
│  when appropriate     │   │                         │
└───────────────────────┘   └─────────────────────────┘
        │                              │
        └──────────────┬───────────────┘
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
| **Vectors in turbopuffer** | ~4.47 million |
| **Dataset** | AmericanStories (`gustavecortal/american-stories-sample`) |
| **Vector dimension** | 384 (all-MiniLM-L6-v2) |
| **Namespace** | `chronoscopes-v2` |
| **Era coverage** | Gilded Age · WWI · Jazz Age · WWII |
| **Cold query latency** | ~500ms |
| **Warm cache latency** | ~8ms |
| **Passages per query** | Top-8 returned, top-3 used for synthesis |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 · TypeScript · Vite · Tailwind CSS · Leaflet |
| **Backend** | Python · FastAPI · Uvicorn · Pydantic |
| **Vector DB** | turbopuffer (ANN search, `chronoscopes-v2`) |
| **Embeddings** | sentence-transformers (all-MiniLM-L6-v2) |
| **LLM** | Google Gemini Flash 2.5 — batch analysis + scene synthesis + lyric writing |
| **Music** | ElevenLabs Music API (`/v1/music/compose`, 30–90s, vocal or instrumental) |
| **SFX** | ElevenLabs Sound Effects API (`/v1/sound-generation`, 15s) |
| **Rate limiting** | SlowAPI (5 req/min per IP on `/api/synthesize`) |

---

## Features

- **Lost music reconstruction** — AI writes era-appropriate lyrics drawn from historical newspaper language, not generic period clichés
- **Vocal vs. instrumental decision** — Gemini decides based on passage content: a saloon scene in the Jazz Age gets vocals; a factory floor stays instrumental
- **Era-specific lyric cadence** — Gilded Age parlor ballad, WWI marching anthem, Jazz Age Tin Pan Alley, WWII big band ballad
- **Configurable broadcast length** — choose 30s, 60s, or 90s music before composing
- **Semantic archive search** — natural language queries against 4.47M historical newspaper vectors
- **Era filtering** — restrict results to Gilded Age, WWI, Jazz Age, or WWII
- **Concurrent audio generation** — ElevenLabs music + SFX generated simultaneously
- **Auto-retry on bad prompt** — if ElevenLabs rejects a prompt, retries with their sanitized suggestion
- **Real-time waveform visualization** — Web Audio API `AnalyserNode` drives canvas waveform
- **Vintage newspaper UI** — dispatch cards with halftone overlays, parchment textures, era badges
- **Audio download** — save generated music as `chronoscape-music.mp3`
- **Source transparency** — every sound decision is traceable back to the newspaper passages that informed it

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
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000

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
| `CORS_ORIGINS` | No | Allowed CORS origins (default: `http://localhost:5173`) |
| `RATE_LIMIT_PER_MINUTE` | No | Rate limit for `/api/synthesize` (default: `5`) |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check + turbopuffer cache warm-up |
| `POST` | `/api/search` | ANN vector search → top-8 passages |
| `POST` | `/api/analyze` | Gemini batch analysis — extract sound signatures from passages |
| `POST` | `/api/synthesize` | Scene synthesis + lyric generation + ElevenLabs audio |

All responses use the envelope: `{ "success": true, "data": {...} }`

---

## Project Structure

```
Chronoscapes/
├── start.sh                  # Concurrent backend + frontend startup
├── README.md
├── CLAUDE.md                 # Claude Code configuration
├── backend_py/               # Python FastAPI backend
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, rate limit, lifespan
│   │   ├── config.py         # Pydantic Settings from .env
│   │   ├── routers/          # health, search, analyze, synthesize
│   │   ├── services/         # embeddings, search, analyze, synthesize, audio
│   │   └── lib/              # types, logger
│   └── .env.example
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx           # Main app, state machine, layout
│   │   ├── hooks/            # useChronoscape, useAudio
│   │   ├── components/       # AudioPlayer, ReconstructedScene, DispatchCard, etc.
│   │   └── lib/              # api client, types
│   └── package.json
└── .backup/                  # Retired TypeScript/Hono backend (reference only)
```

---

## Built with

- [**turbopuffer**](https://turbopuffer.com) — ANN vector search across 4.47M newspaper passages
- [**ElevenLabs Music API**](https://elevenlabs.io) — era-accurate music generation with vocal synthesis
- [**ElevenLabs Sound Effects API**](https://elevenlabs.io) — ambient soundscape layering
- [**Google Gemini Flash 2.5**](https://ai.google.dev) — sound extraction, scene synthesis, lyric composition
- [**HuggingFace sentence-transformers**](https://huggingface.co/sentence-transformers) — local embeddings
- [**Leaflet**](https://leafletjs.com) — interactive map with vintage styling
