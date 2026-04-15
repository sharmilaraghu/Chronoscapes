import { useState, useRef, useCallback, useEffect } from 'react';
import { fetchRadioNext } from '../lib/api';
import type { Era, RadioState, RadioTrack } from '../lib/types';

export interface UseChronoRadioReturn {
  radioState: RadioState;
  currentTrack: RadioTrack | null;
  trackNumber: number;
  djScript: string;
  analyserNode: AnalyserNode | null;
  startRadio: () => void;
  stopRadio: () => void;
}

export function useChronoRadio(query: string, era?: Era): UseChronoRadioReturn {
  const [radioState, setRadioState] = useState<RadioState>('idle');
  const [currentTrack, setCurrentTrack] = useState<RadioTrack | null>(null);
  const [djScript, setDjScript] = useState('');
  const [trackNumber, setTrackNumber] = useState(0);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Refs that mirror state so event handlers never close over stale values
  const radioStateRef = useRef<RadioState>('idle');
  const currentTrackRef = useRef<RadioTrack | null>(null);
  const trackNumberRef = useRef(0);

  const setRadioStateSynced = useCallback((s: RadioState) => {
    radioStateRef.current = s;
    setRadioState(s);
  }, []);

  const setCurrentTrackSynced = useCallback((t: RadioTrack | null) => {
    currentTrackRef.current = t;
    setCurrentTrack(t);
  }, []);

  const setTrackNumberSynced = useCallback((n: number) => {
    trackNumberRef.current = n;
    setTrackNumber(n);
  }, []);

  // Audio elements — created once, reused
  const djAudioRef = useRef<HTMLAudioElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Web Audio context — wired to music element for waveform
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Prefetch queue and flag
  const queueRef = useRef<RadioTrack[]>([]);
  const prefetchingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // --- Audio context setup (called once on first music play) ---
  const initAudioCtx = useCallback((audio: HTMLAudioElement) => {
    if (audioCtxRef.current) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    setAnalyserNode(analyser);
  }, []);

  // --- Transition to next track (play DJ TTS then music) ---
  const transitionToTrack = useCallback((track: RadioTrack, num: number) => {
    setCurrentTrackSynced(track);
    setDjScript(track.djScript);
    setTrackNumberSynced(num);

    const djAudio = djAudioRef.current!;
    djAudio.src = track.ttsUrl;
    djAudio.load();
    setRadioStateSynced('playing-dj');

    djAudio.play().catch(() => {
      // Autoplay blocked — skip straight to music
      const musicAudio = musicAudioRef.current!;
      musicAudio.src = track.musicUrl;
      musicAudio.load();
      setRadioStateSynced('playing-music');
      musicAudio.play().catch(() => {/* silent */});
    });
  }, [setCurrentTrackSynced, setDjScript, setTrackNumberSynced, setRadioStateSynced]);

  // --- Prefetch next track into queue ---
  const prefetchNext = useCallback(() => {
    if (prefetchingRef.current) return;
    prefetchingRef.current = true;
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Read current state from refs (not stale closure values)
    const prevSummary = currentTrackRef.current?.scene.sceneSummary;
    const nextTrackNumber = trackNumberRef.current + 1;

    fetchRadioNext({ query, era, previousSummary: prevSummary, trackNumber: nextTrackNumber }, ctrl.signal)
      .then((track) => {
        prefetchingRef.current = false;
        queueRef.current.push(track);
        // If we hit buffering while waiting, transition immediately
        if (radioStateRef.current === 'buffering') {
          const next = queueRef.current.shift()!;
          transitionToTrack(next, trackNumberRef.current + 1);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'CanceledError') return;
        prefetchingRef.current = false;
      });
  }, [query, era, transitionToTrack]);

  // --- DJ audio ended → start music ---
  const onDjEnded = useCallback(() => {
    const musicAudio = musicAudioRef.current;
    if (!musicAudio || radioStateRef.current !== 'playing-dj') return;
    const track = currentTrackRef.current;
    if (!track) return;

    musicAudio.src = track.musicUrl;
    musicAudio.load();
    setRadioStateSynced('playing-music');

    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {/* silent */});
    }
    initAudioCtx(musicAudio);
    musicAudio.play().catch(() => {/* silent */});
  }, [setRadioStateSynced, initAudioCtx]);

  // --- Music timeupdate → prefetch at 30s ---
  const onMusicTimeUpdate = useCallback(() => {
    const musicAudio = musicAudioRef.current;
    if (!musicAudio) return;
    if (musicAudio.currentTime >= 30 && !prefetchingRef.current && queueRef.current.length === 0) {
      prefetchNext();
    }
  }, [prefetchNext]);

  // --- Music ended → play next or buffer ---
  const onMusicEnded = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      transitionToTrack(next, trackNumberRef.current + 1);
    } else {
      setRadioStateSynced('buffering');
      if (!prefetchingRef.current) prefetchNext();
    }
  }, [transitionToTrack, setRadioStateSynced, prefetchNext]);

  // --- Wire event listeners on mount ---
  useEffect(() => {
    djAudioRef.current = new Audio();
    musicAudioRef.current = new Audio();

    const dj = djAudioRef.current;
    const music = musicAudioRef.current;
    dj.onended = onDjEnded;
    music.ontimeupdate = onMusicTimeUpdate;
    music.onended = onMusicEnded;

    return () => {
      dj.pause();
      music.pause();
      dj.src = '';
      music.src = '';
      audioCtxRef.current?.close();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-attach handlers when callbacks update
  useEffect(() => {
    if (djAudioRef.current) djAudioRef.current.onended = onDjEnded;
  }, [onDjEnded]);

  useEffect(() => {
    if (musicAudioRef.current) {
      musicAudioRef.current.ontimeupdate = onMusicTimeUpdate;
      musicAudioRef.current.onended = onMusicEnded;
    }
  }, [onMusicTimeUpdate, onMusicEnded]);

  // --- Public API ---
  const startRadio = useCallback(() => {
    if (radioStateRef.current !== 'idle') return;

    queueRef.current = [];
    prefetchingRef.current = false;
    setRadioStateSynced('loading');

    fetchRadioNext({ query, era, trackNumber: 1 })
      .then((track) => transitionToTrack(track, 1))
      .catch(() => setRadioStateSynced('idle'));
  }, [query, era, setRadioStateSynced, transitionToTrack]);

  const stopRadio = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    prefetchingRef.current = false;
    queueRef.current = [];

    djAudioRef.current?.pause();
    musicAudioRef.current?.pause();
    if (djAudioRef.current) djAudioRef.current.src = '';
    if (musicAudioRef.current) musicAudioRef.current.src = '';

    // Close and null the AudioContext so initAudioCtx recreates it cleanly on next start
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setAnalyserNode(null);

    setCurrentTrackSynced(null);
    setDjScript('');
    setTrackNumberSynced(0);
    setRadioStateSynced('idle');
  }, [setCurrentTrackSynced, setTrackNumberSynced, setRadioStateSynced]);

  return { radioState, currentTrack, trackNumber, djScript, analyserNode, startRadio, stopRadio };
}
