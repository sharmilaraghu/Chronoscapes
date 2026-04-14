import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  analyserNode: AnalyserNode | null;
}

interface UseAudioReturn extends AudioState {
  play: () => void;
  pause: () => void;
  setUrl: (url: string) => void;
}

export function useAudio(): UseAudioReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    analyserNode: null,
  });

  const initAudioContext = useCallback((audio: HTMLAudioElement) => {
    if (audioCtxRef.current) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
    setState((prev) => ({ ...prev, analyserNode: analyser }));
  }, []);

  const setUrl = useCallback((url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
    } else {
      audioRef.current.src = url;
    }
    const audio = audioRef.current;
    audio.onloadedmetadata = () => setState((prev) => ({ ...prev, duration: audio.duration }));
    audio.ontimeupdate = () => setState((prev) => ({ ...prev, currentTime: audio.currentTime }));
    audio.onended = () => setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const play = useCallback(async () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    // Wait for audio to be ready before attempting to play
    if (audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise<void>((resolve) => {
        const onCanPlay = () => {
          audio.removeEventListener('canplay', onCanPlay);
          resolve();
        };
        audio.addEventListener('canplay', onCanPlay);
      });
    }

    initAudioContext(audio);
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    const promise = audio.play();
    playPromiseRef.current = promise;
    promise?.then(() => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    }).catch(() => {
      // Interrupted — do not update state
    });
  }, [initAudioContext]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Wait for any pending play() promise before pausing (Chrome requirement)
    if (playPromiseRef.current) {
      playPromiseRef.current.then(() => {
        audio.pause();
        setState((prev) => ({ ...prev, isPlaying: false }));
      }).catch(() => {});
    } else {
      audio.pause();
      setState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioCtxRef.current?.close();
    };
  }, []);

  return { ...state, play, pause, setUrl };
}
