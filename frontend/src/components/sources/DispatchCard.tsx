import { useState } from 'react';
import type { ChunkAnalysis } from '../../lib/types';

interface DispatchCardProps {
  analysis: ChunkAnalysis;
  rawText: string;
  selected: boolean;
  onToggle: (id: string) => void;
  index: number;
}

// Deterministic tilt from index
const TILTS = ['-0.5deg', '0.4deg', '-0.8deg', '0.6deg', '-0.3deg', '0.7deg', '-0.6deg', '0.5deg'];

// Sound keyword emoji map
const SOUND_ICONS: Record<string, string> = {
  jazz: '🎷',
  music: '🎵',
  band: '🎺',
  crowd: '👥',
  noise: '🔊',
  train: '🚂',
  car: '🚗',
  horse: '🐴',
  rain: '🌧',
  wind: '💨',
  voices: '🗣',
  laughter: '😂',
  church: '🔔',
  factory: '🏭',
  market: '🏪',
  children: '👶',
};

function getIcon(keyword: string): string {
  const lower = keyword.toLowerCase();
  for (const [key, icon] of Object.entries(SOUND_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '🔊';
}

export default function DispatchCard({
  analysis,
  rawText,
  selected,
  onToggle,
  index,
}: DispatchCardProps) {
  const [showSource, setShowSource] = useState(false);
  const tilt = TILTS[index % TILTS.length];

  const isFailed = analysis.error === true;

  return (
    <article
      className={`dispatch-card ${selected ? 'dispatch-card--selected' : ''} ${isFailed ? 'dispatch-card--failed' : ''}`}
      style={{
        transform: `rotate(${tilt})`,
        transition: 'opacity 0.2s, box-shadow 0.15s, transform 0.15s',
      }}
    >
      {/* Selection checkbox */}
      <div className="dispatch-checkbox-wrapper">
        <input
          type="checkbox"
          id={`dispatch-${analysis.id}`}
          checked={selected}
          disabled={isFailed}
          onChange={() => onToggle(analysis.id)}
          className="dispatch-checkbox"
        />
        <label
          htmlFor={`dispatch-${analysis.id}`}
          className="dispatch-checkbox-label"
        >
          {selected ? '✓' : ''}
        </label>
      </div>

      {/* Error badge */}
      {isFailed && (
        <div className="dispatch-error-badge">Analysis unavailable</div>
      )}

      {/* Header */}
      <div className="dispatch-header">
        <span className="dispatch-era-badge">{analysis.soundProfile?.environment ?? 'archive'}</span>
        <h3 className="dispatch-title">{analysis.cleanTitle}</h3>
      </div>

      {/* Summary */}
      <p className="dispatch-summary">{analysis.summary}</p>

      {/* Sound keywords */}
      {analysis.soundKeywords.length > 0 && (
        <div className="dispatch-keywords">
          {analysis.soundKeywords.slice(0, 5).map((kw) => (
            <span key={kw} className="dispatch-keyword-tag" title={kw}>
              {getIcon(kw)} {kw}
            </span>
          ))}
        </div>
      )}

      {/* Highlight phrases */}
      {analysis.highlightPhrases.length > 0 && (
        <div className="dispatch-highlights">
          {analysis.highlightPhrases.slice(0, 2).map((phrase, i) => (
            <blockquote key={i} className="dispatch-highlight-quote">
              "{phrase}"
            </blockquote>
          ))}
        </div>
      )}

      {/* Sound profile meta */}
      <div className="dispatch-meta">
        <span className="dispatch-meta-item">
          <span className="dispatch-meta-icon">🕐</span>
          {analysis.soundProfile?.timeOfDay ?? 'unknown time'}
        </span>
        <span className="dispatch-meta-item">
          <span className="dispatch-meta-icon">📊</span>
          {analysis.soundProfile?.intensity ?? 'unknown intensity'}
        </span>
      </div>

      {/* View Source toggle */}
      <button
        className="dispatch-source-toggle"
        onClick={() => setShowSource(!showSource)}
        type="button"
      >
        {showSource ? '▲ Hide Source' : '▼ View Source'}
      </button>

      {/* Raw OCR text (collapsible) */}
      {showSource && (
        <pre className="dispatch-source-text">{rawText || 'No source text available.'}</pre>
      )}
    </article>
  );
}