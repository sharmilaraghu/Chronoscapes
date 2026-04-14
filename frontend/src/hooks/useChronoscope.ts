import { useState, useCallback } from 'react';
import { searchPassages, generateAudio } from '../lib/api';
import type { AppState, Era, Passage } from '../lib/types';

interface ChronoscopeResult {
  appState: AppState;
  passages: Passage[];
  hasSearched: boolean;
  musicUrl: string | null;
  sfxUrl: string | null;
  musicPrompt: string | null;
  sfxPrompt: string | null;
  error: string | null;
  search: (query: string, era: Era | undefined) => Promise<void>;
  generate: (passage: Passage) => Promise<void>;
  reset: () => void;
}

export function useChronoscope(): ChronoscopeResult {
  const [appState, setAppState] = useState<AppState>('idle');
  const [passages, setPassages] = useState<Passage[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [sfxUrl, setSfxUrl] = useState<string | null>(null);
  const [musicPrompt, setMusicPrompt] = useState<string | null>(null);
  const [sfxPrompt, setSfxPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setAppState('idle');
    setPassages([]);
    setHasSearched(false);
    setMusicUrl(null);
    setSfxUrl(null);
    setMusicPrompt(null);
    setSfxPrompt(null);
    setError(null);
  }, []);

  const search = useCallback(async (query: string, era: Era | undefined) => {
    reset();
    setError(null);

    try {
      setAppState('searching');
      setLastQuery(query);
      const res = await searchPassages({ query, era, limit: 8 });

      if (!res.success) {
        throw new Error(res.error ?? 'Search failed');
      }

      const found = res.data.passages;
      setPassages(found);
      setHasSearched(true);

      if (found.length === 0) {
        setAppState('idle');
        return;
      }

      setAppState('selected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setAppState('error');
    }
  }, [reset]);

  const generate = useCallback(async (passage: Passage) => {
    setError(null);

    try {
      setAppState('generating');
      const res = await generateAudio({ passage, query: lastQuery || passage.title });

      if (!res.success) {
        throw new Error(res.error ?? 'Generation failed');
      }

      setMusicUrl(res.data.musicUrl);
      setSfxUrl(res.data.sfxUrl);
      setMusicPrompt(res.data.musicPrompt);
      setSfxPrompt(res.data.sfxPrompt);
      setAppState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
      setAppState('error');
    }
  }, [lastQuery]);

  return {
    appState,
    passages,
    hasSearched,
    musicUrl,
    sfxUrl,
    musicPrompt,
    sfxPrompt,
    error,
    search,
    generate,
    reset,
  };
}
