# Chronoscapes — Architecture

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
