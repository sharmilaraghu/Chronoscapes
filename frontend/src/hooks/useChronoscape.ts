import { useState, useCallback } from 'react';
import { searchPassages, analyzePassages, synthesizeScene } from '../lib/api';
import type { AppState, Era, MusicDuration, Passage, ChunkAnalysis, SynthesizedScene } from '../lib/types';

interface ChronoscapeResult {
  appState: AppState;
  passages: Passage[];
  analyzedChunks: ChunkAnalysis[];
  selectedChunkIds: string[];
  rawTextById: Map<string, string>;
  synthesizedScene: SynthesizedScene | null;
  musicUrl: string | null;
  sfxUrl: string | null;
  hasSearched: boolean;
  error: string | null;
  correlationId: string | null;
  musicDuration: MusicDuration;
  setMusicDuration: (d: MusicDuration) => void;
  search: (query: string, era: Era | undefined) => Promise<void>;
  selectChunk: (id: string) => void;
  deselectChunk: (id: string) => void;
  confirmSelection: () => Promise<void>;
  reset: () => void;
}

export function useChronoscape(): ChronoscapeResult {
  const [appState, setAppState] = useState<AppState>('idle');
  const [passages, setPassages] = useState<Passage[]>([]);
  const [analyzedChunks, setAnalyzedChunks] = useState<ChunkAnalysis[]>([]);
  const [selectedChunkIds, setSelectedChunkIds] = useState<string[]>([]);
  const [rawTextById] = useState<Map<string, string>>(new Map());
  const [synthesizedScene, setSynthesizedScene] = useState<SynthesizedScene | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [sfxUrl, setSfxUrl] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [musicDuration, setMusicDuration] = useState<MusicDuration>(30);

  const reset = useCallback(() => {
    setAppState('idle');
    setPassages([]);
    setAnalyzedChunks([]);
    setSelectedChunkIds([]);
    rawTextById.clear();
    setSynthesizedScene(null);
    setMusicUrl(null);
    setSfxUrl(null);
    setHasSearched(false);
    setError(null);
    setCorrelationId(null);
  }, [rawTextById]);

  const search = useCallback(async (query: string, era: Era | undefined) => {
    reset();
    setError(null);

    try {
      setAppState('searching');
      const res = await searchPassages({ query, era, limit: 8 });

      if (!res.success) {
        throw new Error(res.error ?? 'Search failed');
      }

      const found = res.data.passages;
      if (found.length === 0) {
        setPassages([]);
        setHasSearched(true);
        setAppState('idle');
        return;
      }

      // Preserve raw text for View Source toggle
      found.forEach((p) => rawTextById.set(p.id, p.text));

      setPassages(found);
      setHasSearched(true);

      // Phase 1: analyze all chunks (one batch LLM call)
      setAppState('analyzing');
      const analyzeRes = await analyzePassages({ passages: found });

      if (!analyzeRes.success) {
        throw new Error(analyzeRes.error ?? 'Analysis failed');
      }

      // Extract correlation ID from metadata if available
      if (analyzeRes.metadata?.correlationId) {
        setCorrelationId(analyzeRes.metadata.correlationId as string);
      }

      const analyses = analyzeRes.data.analyses;
      setAnalyzedChunks(analyses);

      // Auto-select top 6 by soundKeywords count
      const autoSelected = [...analyses]
        .filter((a) => !a.error) // don't auto-select failed chunks
        .sort((a, b) => b.soundKeywords.length - a.soundKeywords.length)
        .slice(0, 6)
        .map((a) => a.id);

      setSelectedChunkIds(autoSelected);
      setAppState('selected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search/analysis failed');
      setAppState('error');
    }
  }, [reset, rawTextById]);

  const selectChunk = useCallback((id: string) => {
    setSelectedChunkIds((prev) => {
      if (prev.includes(id)) return prev;
      if (prev.length >= 6) return prev; // max 6 selections
      return [...prev, id];
    });
  }, []);

  const deselectChunk = useCallback((id: string) => {
    setSelectedChunkIds((prev) => prev.filter((chunkId) => chunkId !== id));
  }, []);

  const confirmSelection = useCallback(async () => {
    if (selectedChunkIds.length === 0) return;

    setError(null);

    try {
      setAppState('synthesizing');

      const selectedAnalyses = analyzedChunks.filter(
        (a) => selectedChunkIds.includes(a.id),
      );

      // Find city/era from passages using the analyzed chunk IDs
      const selectedPassages = passages.filter((p) =>
        selectedChunkIds.includes(p.id),
      );

      const city = selectedPassages[0]?.location ?? 'Unknown';
      const era = selectedPassages[0]?.era ?? 'Jazz_Age';

      const res = await synthesizeScene({
        analyses: selectedAnalyses,
        city,
        era,
        musicDurationSeconds: musicDuration,
      });

      if (!res.success) {
        throw new Error(res.error ?? 'Synthesis failed');
      }

      if (res.metadata?.correlationId) {
        setCorrelationId(res.metadata.correlationId as string);
      }

      setSynthesizedScene(res.data.scene);
      setMusicUrl(res.data.musicUrl);
      setSfxUrl(res.data.sfxUrl);
      setAppState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Synthesis failed');
      setAppState('error');
    }
  }, [selectedChunkIds, analyzedChunks, passages, musicDuration]);

  return {
    appState,
    passages,
    analyzedChunks,
    selectedChunkIds,
    rawTextById,
    synthesizedScene,
    musicUrl,
    sfxUrl,
    hasSearched,
    error,
    correlationId,
    musicDuration,
    setMusicDuration,
    search,
    selectChunk,
    deselectChunk,
    confirmSelection,
    reset,
  };
}