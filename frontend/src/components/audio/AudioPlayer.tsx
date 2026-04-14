import { useEffect } from 'react';
import { useAudio } from '../../hooks/useAudio';
import WaveformViz from './WaveformViz';
import type { Era, AppState } from '../../lib/types';
import { ERA_LABELS } from '../../lib/types';

interface AudioPlayerProps {
  musicUrl: string | null;
  sfxUrl: string | null;
  synthesizedPrompt: string | null;
  era: Era | undefined;
  location: string;
  appState?: AppState;
  onReset?: () => void;
}

export default function AudioPlayer({
  musicUrl,
  synthesizedPrompt,
  era,
  location,
  appState,
  onReset,
}: AudioPlayerProps) {
  const { isPlaying, play, pause, setUrl, analyserNode } = useAudio();

  useEffect(() => {
    if (musicUrl) {
      setUrl(musicUrl);
      // Auto-play when audio is ready
      play();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicUrl]);

  const hasAudio = !!musicUrl;
  const isGenerating = appState === 'generating';
  const isReady = appState === 'ready';
  const isSearching = appState === 'searching';
  const eraLabel = era ? ERA_LABELS[era] : null;
  const locLabel = location || null;

  return (
    <div className="radio-chassis">
      <p className="radio-brand">✦ Chronoscape Radio ✦</p>

      <div className="radio-dial">
        <p className="radio-dial-label">Now Broadcasting</p>
        <p className="radio-dial-era">
          {locLabel && eraLabel ? `${locLabel} · ${eraLabel}` : locLabel || eraLabel || '── Awaiting Transmission ──'}
        </p>
      </div>

      <WaveformViz
        analyserNode={analyserNode}
        isPlaying={isPlaying}
        isSynthesizing={isGenerating}
      />

      {/* State messages */}
      {isSearching && (
        <div className="radio-status-label">
          <span className="telegraph-blink">Searching Archive</span>
        </div>
      )}
      {isGenerating && (
        <div className="radio-status-label">
          <span className="telegraph-blink">Composing Soundscape</span>
          <span className="radio-generating-dots"> . . .</span>
        </div>
      )}
      {!hasAudio && !isGenerating && !isSearching && (
        <div className="radio-idle-hint">
          {/* Static signal bars */}
          <div className="radio-signal-bars">
            {[0.3,0.5,0.8,1,0.7,0.4,0.6,0.9,0.5,0.3,0.7,1,0.6,0.4,0.8].map((h, i) => (
              <span key={i} className="radio-signal-bar" style={{ height: `${h * 28}px`, opacity: 0.25 + h * 0.3 }} />
            ))}
          </div>
          <p className="radio-idle-text">No Signal</p>
          <p className="radio-idle-subtext">Search the archive to tune in</p>
        </div>
      )}

      {/* Play / Pause */}
      <div className="radio-controls">
        <button
          className="radio-play-btn"
          onClick={isPlaying ? pause : play}
          disabled={!hasAudio}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          type="button"
          title={hasAudio ? (isPlaying ? 'Pause' : 'Play') : 'Generate audio first'}
        >
          {isPlaying ? (
            <span className="radio-btn-icon">▐▐</span>
          ) : (
            <span className="radio-btn-icon" style={{ marginLeft: '3px' }}>▶</span>
          )}
        </button>
      </div>

      {synthesizedPrompt && (
        <div className="radio-notes">
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.5rem' }}>
            Broadcast Notes
          </span>
          <br />
          {synthesizedPrompt}
        </div>
      )}

      {isReady && onReset && (
        <button className="radio-reset-btn" onClick={onReset} type="button">
          ← New Search
        </button>
      )}
    </div>
  );
}
