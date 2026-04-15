import WaveformViz from './WaveformViz';
import type { Era, RadioState } from '../../lib/types';
import { ERA_LABELS } from '../../lib/types';

interface RadioPlayerProps {
  radioState: RadioState;
  djScript: string;
  trackNumber: number;
  analyserNode: AnalyserNode | null;
  era: Era | undefined;
  city: string;
  onStop: () => void;
}

const PHASE_LABEL: Record<RadioState, string> = {
  idle:            '',
  loading:         'Tuning In…',
  'playing-dj':    'Announcer',
  'playing-music': 'On Air',
  buffering:       'Buffering…',
};

export default function RadioPlayer({
  radioState,
  djScript,
  trackNumber,
  analyserNode,
  era,
  city,
  onStop,
}: RadioPlayerProps) {
  const isLive = radioState === 'playing-dj' || radioState === 'playing-music';
  const isLoading = radioState === 'loading' || radioState === 'buffering';
  const isMusicPlaying = radioState === 'playing-music';
  const eraLabel = era ? ERA_LABELS[era] : null;

  return (
    <div className="radio-chassis">
      <p className="radio-brand">✦ Chronoscapes Radio ✦</p>

      {/* ON AIR / status strip */}
      <div className="radio-dial">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
          {isLive && (
            <span className="radio-on-air-dot" aria-label="On air" />
          )}
          <p className="radio-dial-label" style={{ margin: 0 }}>
            {PHASE_LABEL[radioState] || 'Chrono Radio'}
          </p>
          {trackNumber > 0 && (
            <span style={{ fontSize: '0.5rem', opacity: 0.5, letterSpacing: '0.1em' }}>
              #{trackNumber}
            </span>
          )}
        </div>
        <p className="radio-dial-era">
          {city && eraLabel ? `${city} · ${eraLabel}` : eraLabel ?? '── Awaiting Signal ──'}
        </p>
      </div>

      {/* Waveform — shows during music, idle sine during loading */}
      <WaveformViz
        analyserNode={analyserNode}
        isPlaying={isMusicPlaying}
        isSynthesizing={isLoading}
      />

      {/* DJ script display */}
      {radioState === 'playing-dj' && djScript && (
        <div className="radio-notes" style={{ fontStyle: 'italic', textAlign: 'center' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.5rem', fontStyle: 'normal' }}>
            On Air
          </span>
          <br />
          &ldquo;{djScript}&rdquo;
        </div>
      )}

      {/* Loading / buffering label */}
      {isLoading && (
        <div className="radio-status-label">
          <span className="telegraph-blink">
            {radioState === 'loading' ? 'Generating first track' : 'Preparing next track'}
          </span>
          <span className="radio-generating-dots"> . . .</span>
        </div>
      )}

      {/* Controls */}
      <div className="radio-controls">
        <button
          className="radio-play-btn"
          onClick={onStop}
          aria-label="Stop radio"
          type="button"
          title="Stop Chrono Radio"
          style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}
        >
          <span className="radio-btn-icon">■ Stop</span>
        </button>
      </div>
    </div>
  );
}
