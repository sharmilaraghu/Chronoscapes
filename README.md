# Chronoscapes — Music from the Lost Ages

![License: MIT](https://img.shields.io/badge/License-MIT-c8a84b.svg)

> What did a Harlem jazz club sound like in 1925? What songs filled a London street during the Blitz?
> Chronoscapes brings that music back.

Centuries of music were never recorded. The only evidence that it existed at all is buried in the text of old newspapers — reviews of performances, advertisements for dance halls, dispatches from the front describing soldiers singing around fires. Chronoscapes reads those archives and recreates the music they describe: complete with lyrics written in the vernacular of the era, melody shaped by the instruments and rhythms the passages mention, and ambient sound layered beneath it.

No recordings. No samples. Just historical evidence, AI synthesis, and ElevenLabs turning it into sound.

> **4.47 million** historical newspaper passages indexed in turbopuffer. Warm-cache query latency: **~8ms**.

---

### Landing page — choose your era, enter the archive

![Landing page — era selector and archive entry](https://github.com/user-attachments/assets/780fa860-bd7b-4b04-8ed4-37873ff60587)

### Archive search — real newspaper dispatches ranked by semantic relevance

![Search results — archival passages with sound analysis tags](https://github.com/user-attachments/assets/22284b65-a196-4836-b87b-743e5921d501)

The retrieved passages aren't summaries or paraphrases — they're real 19th and 20th century newspaper text, ranked by how closely their language matches your query. Each card shows the extracted sound profile: instruments, environment, mood, and highlight phrases that will shape the composition.

### Map mode — explore history by location

![Map search — pick any city or region to query its historical soundscape](https://github.com/user-attachments/assets/0082dd4b-0343-4ef5-8406-3c4e15fef72c)

Drop a pin anywhere on the map and Chronoscapes queries the archive for newspaper passages from that place. The same RAG pipeline runs: real dispatches from that location become the evidence for the audio reconstruction.

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

---

## Features

- **Lost music reconstruction** — AI writes era-appropriate lyrics drawn from actual historical newspaper language, not generic period clichés
- **Vocal vs. instrumental decision** — Gemini decides from passage content: a saloon scene in the Jazz Age gets vocals; a factory floor stays instrumental
- **Era-specific lyric cadence** — Gilded Age parlor ballad, WWI marching anthem, Jazz Age Tin Pan Alley, WWII big band ballad
- **Semantic archive search** — natural language queries against 4.47M historical newspaper vectors in turbopuffer
- **Source transparency** — every sound decision is traceable back to the newspaper passages that grounded it

---

## Built with

- [**turbopuffer**](https://turbopuffer.com) — ANN vector search across 4.47M newspaper passages
- [**ElevenLabs Music API**](https://elevenlabs.io) — era-accurate music generation with vocal synthesis
- [**ElevenLabs Sound Effects API**](https://elevenlabs.io) — ambient soundscape layering
- [**Google Gemini Flash 2.5**](https://ai.google.dev) — sound extraction, scene synthesis, lyric composition
- [**HuggingFace sentence-transformers**](https://huggingface.co/sentence-transformers) — local embeddings
- [**Leaflet**](https://leafletjs.com) — interactive map with vintage styling
